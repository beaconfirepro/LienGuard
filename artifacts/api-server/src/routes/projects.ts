import { Router } from "express";
import { db } from "@workspace/db";
import {
  lienProjectsTable,
  projectPartyLinksTable,
  subSystemTypesTable,
  lienStreamsTable,
  jurisdictionsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";
import { hubspotClient } from "../lib/clients/hubspot";

const router = Router();
router.use(requireSession);

// ---------------------------------------------------------------------------
// Risk helpers
// ---------------------------------------------------------------------------

type RiskLevel = "high" | "medium" | "low" | "ok";

const STREAM_STATUS_RISK: Record<string, RiskLevel> = {
  at_risk: "high",
  filing: "high",
  lapsed: "high",
  notice_active: "medium",
  filed: "medium",
  open: "low",
  released: "ok",
  closed: "ok",
};

const RISK_ORDER: RiskLevel[] = ["high", "medium", "low", "ok"];

function highestRisk(statuses: string[]): RiskLevel | null {
  if (!statuses.length) return null;
  for (const level of RISK_ORDER) {
    if (statuses.some((s) => STREAM_STATUS_RISK[s] === level)) return level;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Checklist helpers
// ---------------------------------------------------------------------------

function computeChecklist(
  project: {
    legalPropertyAddress: string | null;
    county: string | null;
    contractStartDate: Date | null;
    contractorTier: string;
  },
  parties: { partyRelationType: string }[],
) {
  const missing: { field: string; label: string }[] = [];

  if (!project.legalPropertyAddress) {
    missing.push({ field: "legalPropertyAddress", label: "Legal property address is required" });
  }
  if (!project.county) {
    missing.push({ field: "county", label: "County is required" });
  }
  if (!project.contractStartDate) {
    missing.push({ field: "contractStartDate", label: "Contract start date is required" });
  }
  if (project.contractorTier === "second_tier") {
    const hasHiringParty = parties.some((p) => p.partyRelationType === "hiring_party");
    const hasOriginalContractor = parties.some((p) => p.partyRelationType === "original_contractor");
    if (!hasHiringParty) {
      missing.push({ field: "hiring_party", label: "Hiring party is required for 2nd-tier projects" });
    }
    if (!hasOriginalContractor) {
      missing.push({
        field: "original_contractor",
        label: "Original contractor is required for 2nd-tier projects",
      });
    }
  }

  return { complete: missing.length === 0, missing };
}

async function refreshChecklistComplete(orgId: string, projectId: string) {
  const [project] = await db
    .select()
    .from(lienProjectsTable)
    .where(and(eq(lienProjectsTable.id, projectId), eq(lienProjectsTable.orgId, orgId)))
    .limit(1);
  if (!project) return;

  const parties = await db
    .select({ partyRelationType: projectPartyLinksTable.partyRelationType })
    .from(projectPartyLinksTable)
    .where(and(eq(projectPartyLinksTable.lienProjectId, projectId), eq(projectPartyLinksTable.orgId, orgId)));

  const { complete } = computeChecklist(project, parties);

  await db
    .update(lienProjectsTable)
    .set({ completionChecklistComplete: complete })
    .where(and(eq(lienProjectsTable.id, projectId), eq(lienProjectsTable.orgId, orgId)));
}

// ---------------------------------------------------------------------------
// GET /projects
// Query params: status, lienWorkflowType, contractorTier, incomplete, risk (high|medium|low|ok)
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const { orgId } = getSession(req);
  const { status, lienWorkflowType, contractorTier, incomplete, risk } = req.query as Record<
    string,
    string | undefined
  >;

  const [projects, allStreams, allParties] = await Promise.all([
    db.select().from(lienProjectsTable).where(eq(lienProjectsTable.orgId, orgId)),
    db.select().from(lienStreamsTable).where(eq(lienStreamsTable.orgId, orgId)),
    db
      .select({
        lienProjectId: projectPartyLinksTable.lienProjectId,
        partyRelationType: projectPartyLinksTable.partyRelationType,
      })
      .from(projectPartyLinksTable)
      .where(eq(projectPartyLinksTable.orgId, orgId)),
  ]);

  // Attach streams + compute live checklist for each project
  const projectsWithMeta = projects.map((p) => {
    const streams = allStreams.filter((s) => s.lienProjectId === p.id);
    const parties = allParties.filter((pp) => pp.lienProjectId === p.id);
    const { complete: liveChecklistComplete } = computeChecklist(p, parties);
    return { ...p, completionChecklistComplete: liveChecklistComplete, streams };
  });

  let filtered = projectsWithMeta;

  if (status) {
    filtered = filtered.filter((p) => p.cachedHubspotStatus === status);
  }
  if (lienWorkflowType) {
    filtered = filtered.filter((p) => p.lienWorkflowType === lienWorkflowType);
  }
  if (contractorTier) {
    filtered = filtered.filter((p) => p.contractorTier === contractorTier);
  }
  if (incomplete === "true") {
    filtered = filtered.filter((p) => !p.completionChecklistComplete);
  }
  if (risk) {
    const validRisks: RiskLevel[] = ["high", "medium", "low", "ok"];
    if (validRisks.includes(risk as RiskLevel)) {
      filtered = filtered.filter((p) => {
        const statuses = p.streams.map((s) => s.status);
        return highestRisk(statuses) === (risk as RiskLevel);
      });
    }
  }

  res.json({ projects: filtered });
});

// ---------------------------------------------------------------------------
// POST /projects
// Body: { hubspotProjectId, subSystemTypeId, jurisdictionId?, contractorTier? }
// jurisdictionId is optional — defaults to first active jurisdiction for the org
// ---------------------------------------------------------------------------
router.post("/", async (req, res) => {
  const { orgId } = getSession(req);
  const { hubspotProjectId, subSystemTypeId, jurisdictionId: jurisdictionIdInput, contractorTier } =
    req.body as {
      hubspotProjectId?: string;
      subSystemTypeId?: string;
      jurisdictionId?: string;
      contractorTier?: string;
    };

  if (!hubspotProjectId || typeof hubspotProjectId !== "string") {
    res.status(400).json({ error: "hubspotProjectId is required" });
    return;
  }
  if (!subSystemTypeId || typeof subSystemTypeId !== "string") {
    res.status(400).json({ error: "subSystemTypeId is required" });
    return;
  }

  // Verify subSystemType exists for this org
  const [sst] = await db
    .select()
    .from(subSystemTypesTable)
    .where(and(eq(subSystemTypesTable.id, subSystemTypeId), eq(subSystemTypesTable.orgId, orgId)))
    .limit(1);
  if (!sst) {
    res.status(404).json({ error: "SubSystemType not found" });
    return;
  }

  // Resolve jurisdictionId — use provided value, or fall back to first active jurisdiction for org
  let resolvedJurisdictionId = jurisdictionIdInput?.trim() || "";
  if (!resolvedJurisdictionId) {
    const [firstJur] = await db
      .select({ id: jurisdictionsTable.id })
      .from(jurisdictionsTable)
      .where(and(eq(jurisdictionsTable.orgId, orgId), eq(jurisdictionsTable.active, true)))
      .limit(1);
    if (!firstJur) {
      res.status(400).json({
        error: "No active jurisdiction found for this org. Set up a jurisdiction in Settings first.",
      });
      return;
    }
    resolvedJurisdictionId = firstJur.id;
  } else {
    // Verify explicit jurisdiction exists for this org
    const [jur] = await db
      .select({ id: jurisdictionsTable.id })
      .from(jurisdictionsTable)
      .where(
        and(eq(jurisdictionsTable.id, resolvedJurisdictionId), eq(jurisdictionsTable.orgId, orgId)),
      )
      .limit(1);
    if (!jur) {
      res.status(404).json({ error: "Jurisdiction not found" });
      return;
    }
  }

  // Check for duplicate
  const [existing] = await db
    .select({ id: lienProjectsTable.id })
    .from(lienProjectsTable)
    .where(
      and(
        eq(lienProjectsTable.orgId, orgId),
        eq(lienProjectsTable.hubspotProjectId, hubspotProjectId),
      ),
    )
    .limit(1);
  if (existing) {
    res.status(409).json({ error: "A lien project for this HubSpot project already exists" });
    return;
  }

  // Pull from HubSpot (live if HUBSPOT_API_KEY is set, otherwise fixture)
  const hsProject = await hubspotClient.getProject(hubspotProjectId);

  const validTiers = ["first_tier", "second_tier"];
  const tier =
    contractorTier && validTiers.includes(contractorTier)
      ? (contractorTier as "first_tier" | "second_tier")
      : "first_tier";

  const [project] = await db
    .insert(lienProjectsTable)
    .values({
      orgId,
      hubspotProjectId,
      jurisdictionId: resolvedJurisdictionId,
      subSystemTypeId,
      lienWorkflowType: sst.lienWorkflowType,
      contractorTier: tier,
      cachedProjectName: hsProject?.projectName ?? null,
      cachedHubspotStatus: hsProject?.status ?? null,
      lastSyncedAt: hsProject ? new Date() : null,
      completionChecklistComplete: false,
    })
    .returning();

  res.status(201).json({ project });
});

// ---------------------------------------------------------------------------
// GET /projects/:id
// ---------------------------------------------------------------------------
router.get("/:id", async (req, res) => {
  const { orgId } = getSession(req);
  const id = req.params.id as string;

  const [project] = await db
    .select()
    .from(lienProjectsTable)
    .where(and(eq(lienProjectsTable.id, id), eq(lienProjectsTable.orgId, orgId)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [parties, streams, sstRows] = await Promise.all([
    db
      .select()
      .from(projectPartyLinksTable)
      .where(
        and(eq(projectPartyLinksTable.lienProjectId, id), eq(projectPartyLinksTable.orgId, orgId)),
      ),
    db
      .select()
      .from(lienStreamsTable)
      .where(and(eq(lienStreamsTable.lienProjectId, id), eq(lienStreamsTable.orgId, orgId))),
    db
      .select()
      .from(subSystemTypesTable)
      .where(
        and(eq(subSystemTypesTable.id, project.subSystemTypeId), eq(subSystemTypesTable.orgId, orgId)),
      )
      .limit(1),
  ]);

  const checklist = computeChecklist(project, parties);

  res.json({ project, parties, streams, subSystemType: sstRows[0] ?? null, checklist });
});

// ---------------------------------------------------------------------------
// PATCH /projects/:id
// Body: { contractorTier?, legalPropertyAddress?, county?, contractStartDate? }
// ---------------------------------------------------------------------------
router.patch("/:id", async (req, res) => {
  const { orgId } = getSession(req);
  const id = req.params.id as string;

  const { contractorTier, legalPropertyAddress, county, contractStartDate } = req.body as {
    contractorTier?: string;
    legalPropertyAddress?: string | null;
    county?: string | null;
    contractStartDate?: string | null;
  };

  const [existing] = await db
    .select()
    .from(lienProjectsTable)
    .where(and(eq(lienProjectsTable.id, id), eq(lienProjectsTable.orgId, orgId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const validTiers = ["first_tier", "second_tier"];
  const updates: Record<string, unknown> = {};

  if (contractorTier !== undefined) {
    if (!validTiers.includes(contractorTier)) {
      res.status(400).json({ error: "contractorTier must be first_tier or second_tier" });
      return;
    }
    updates.contractorTier = contractorTier;
  }
  if (legalPropertyAddress !== undefined) updates.legalPropertyAddress = legalPropertyAddress;
  if (county !== undefined) updates.county = county;
  if (contractStartDate !== undefined) {
    updates.contractStartDate = contractStartDate ? new Date(contractStartDate) : null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  await db
    .update(lienProjectsTable)
    .set(updates)
    .where(and(eq(lienProjectsTable.id, id), eq(lienProjectsTable.orgId, orgId)));

  // Recompute checklist after update
  await refreshChecklistComplete(orgId, id);

  const [refreshed] = await db
    .select()
    .from(lienProjectsTable)
    .where(and(eq(lienProjectsTable.id, id), eq(lienProjectsTable.orgId, orgId)))
    .limit(1);

  res.json({ project: refreshed });
});

// ---------------------------------------------------------------------------
// GET /projects/:id/checklist
// ---------------------------------------------------------------------------
router.get("/:id/checklist", async (req, res) => {
  const { orgId } = getSession(req);
  const id = req.params.id as string;

  const [project] = await db
    .select()
    .from(lienProjectsTable)
    .where(and(eq(lienProjectsTable.id, id), eq(lienProjectsTable.orgId, orgId)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const parties = await db
    .select({ partyRelationType: projectPartyLinksTable.partyRelationType })
    .from(projectPartyLinksTable)
    .where(
      and(eq(projectPartyLinksTable.lienProjectId, id), eq(projectPartyLinksTable.orgId, orgId)),
    );

  const checklist = computeChecklist(project, parties);

  res.json(checklist);
});

// ---------------------------------------------------------------------------
// POST /projects/:id/parties
// Body: { hubspotCompanyId, partyRelationType, cachedLegalName?, cachedMailingAddress? }
// ---------------------------------------------------------------------------
router.post("/:id/parties", async (req, res) => {
  const { orgId } = getSession(req);
  const projectId = req.params.id as string;

  const { hubspotCompanyId, partyRelationType, cachedLegalName, cachedMailingAddress } =
    req.body as {
      hubspotCompanyId?: string;
      partyRelationType?: string;
      cachedLegalName?: string;
      cachedMailingAddress?: string;
    };

  if (!hubspotCompanyId || typeof hubspotCompanyId !== "string") {
    res.status(400).json({ error: "hubspotCompanyId is required" });
    return;
  }

  const validRoles = ["owner", "original_contractor", "hiring_party"];
  if (!partyRelationType || !validRoles.includes(partyRelationType)) {
    res.status(400).json({
      error: `partyRelationType must be one of: ${validRoles.join(", ")}`,
    });
    return;
  }

  // Verify project exists
  const [project] = await db
    .select()
    .from(lienProjectsTable)
    .where(and(eq(lienProjectsTable.id, projectId), eq(lienProjectsTable.orgId, orgId)))
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  // Enforce: no duplicate role on same project
  const existingParties = await db
    .select()
    .from(projectPartyLinksTable)
    .where(
      and(
        eq(projectPartyLinksTable.lienProjectId, projectId),
        eq(projectPartyLinksTable.orgId, orgId),
      ),
    );

  const roleAlreadyExists = existingParties.some(
    (p) => p.partyRelationType === partyRelationType,
  );
  if (roleAlreadyExists) {
    res.status(409).json({
      error: `A party with role '${partyRelationType}' already exists on this project. Remove it first to replace.`,
    });
    return;
  }

  // Try to fetch legal name from HubSpot if not provided
  let legalName = cachedLegalName?.trim();
  let mailingAddress = cachedMailingAddress?.trim();

  if (!legalName) {
    const hsCompany = await hubspotClient.getCompany(hubspotCompanyId);
    if (hsCompany) {
      legalName = hsCompany.legalName;
      mailingAddress = mailingAddress ?? hsCompany.mailingAddress;
    }
  }

  if (!legalName) {
    res.status(400).json({
      error: "cachedLegalName is required (or hubspotCompanyId must match a known company)",
    });
    return;
  }

  const [party] = await db
    .insert(projectPartyLinksTable)
    .values({
      orgId,
      lienProjectId: projectId,
      partyRelationType: partyRelationType as "owner" | "original_contractor" | "hiring_party",
      hubspotCompanyId,
      cachedLegalName: legalName,
      cachedMailingAddress: mailingAddress ?? null,
      lastSyncedAt: new Date(),
    })
    .returning();

  // Recompute checklist
  await refreshChecklistComplete(orgId, projectId);

  // 2nd-tier dual-party warning
  const warnings: string[] = [];
  if (project.contractorTier === "second_tier") {
    const allParties = [...existingParties, party];
    const hasHP = allParties.some((p) => p.partyRelationType === "hiring_party");
    const hasOC = allParties.some((p) => p.partyRelationType === "original_contractor");
    if (!hasHP) warnings.push("hiring_party is still required for 2nd-tier projects");
    if (!hasOC) warnings.push("original_contractor is still required for 2nd-tier projects");
  }

  res.status(201).json({ party, warnings });
});

// ---------------------------------------------------------------------------
// DELETE /projects/:id/parties/:partyId  →  204 No Content
// ---------------------------------------------------------------------------
router.delete("/:id/parties/:partyId", async (req, res) => {
  const { orgId } = getSession(req);
  const projectId = req.params.id as string;
  const partyId = req.params.partyId as string;

  const [party] = await db
    .select()
    .from(projectPartyLinksTable)
    .where(
      and(
        eq(projectPartyLinksTable.id, partyId),
        eq(projectPartyLinksTable.lienProjectId, projectId),
        eq(projectPartyLinksTable.orgId, orgId),
      ),
    )
    .limit(1);

  if (!party) {
    res.status(404).json({ error: "Party not found" });
    return;
  }

  await db
    .delete(projectPartyLinksTable)
    .where(
      and(
        eq(projectPartyLinksTable.id, partyId),
        eq(projectPartyLinksTable.orgId, orgId),
      ),
    );

  // Recompute checklist
  await refreshChecklistComplete(orgId, projectId);

  res.status(204).end();
});

export default router;
