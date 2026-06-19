import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  departmentsTable,
  systemTypesTable,
  subSystemTypesTable,
  stageTriggerConfigsTable,
  jurisdictionsTable,
  lienRuleSetsTable,
  lienRulesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";
import { requireAdmin } from "../lib/admin";

const router: IRouter = Router();

router.use(requireSession);

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

/**
 * GET /config/departments
 * Returns full department tree: dept → system types → sub-system types.
 */
router.get("/departments", async (req, res) => {
  const { orgId } = getSession(req);
  const [departments, systemTypes, subSystemTypes] = await Promise.all([
    db.select().from(departmentsTable).where(eq(departmentsTable.orgId, orgId)),
    db.select().from(systemTypesTable).where(eq(systemTypesTable.orgId, orgId)),
    db
      .select()
      .from(subSystemTypesTable)
      .where(eq(subSystemTypesTable.orgId, orgId)),
  ]);

  const tree = departments.map((dept) => ({
    ...dept,
    systemTypes: systemTypes
      .filter((st) => st.departmentId === dept.id)
      .map((st) => ({
        ...st,
        subSystemTypes: subSystemTypes.filter(
          (sst) => sst.systemTypeId === st.id,
        ),
      })),
  }));

  res.json({ departments: tree });
});

/**
 * PATCH /config/departments/:id
 * Partial update: name
 */
router.patch("/departments/:id", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const id = req.params.id as string;
  const { name } = req.body as { name?: string };

  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [updated] = await db
    .update(departmentsTable)
    .set({ name: name.trim() })
    .where(and(eq(departmentsTable.id, id), eq(departmentsTable.orgId, orgId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  res.json({ department: updated });
});

/**
 * POST /config/departments
 * Creates a department. Body: { name }
 */
router.post("/departments", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const { name } = req.body as { name?: string };

  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [dept] = await db
    .insert(departmentsTable)
    .values({ orgId, name: name.trim() })
    .returning();

  res.status(201).json({ department: dept });
});

// ---------------------------------------------------------------------------
// System Types
// ---------------------------------------------------------------------------

/**
 * GET /config/system-types
 * Returns all system types for the org. Optional ?departmentId= filter.
 */
router.get("/system-types", async (req, res) => {
  const { orgId } = getSession(req);
  const { departmentId } = req.query as { departmentId?: string };

  const rows = await db
    .select()
    .from(systemTypesTable)
    .where(
      departmentId
        ? and(
            eq(systemTypesTable.orgId, orgId),
            eq(systemTypesTable.departmentId, departmentId),
          )
        : eq(systemTypesTable.orgId, orgId),
    );

  res.json({ systemTypes: rows });
});

/**
 * PATCH /config/system-types/:id
 * Partial update: name
 */
router.patch("/system-types/:id", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const id = req.params.id as string;
  const { name } = req.body as { name?: string };

  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [updated] = await db
    .update(systemTypesTable)
    .set({ name: name.trim() })
    .where(and(eq(systemTypesTable.id, id), eq(systemTypesTable.orgId, orgId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "SystemType not found" });
    return;
  }

  res.json({ systemType: updated });
});

/**
 * POST /config/system-types
 * Body: { name, departmentId }
 */
router.post("/system-types", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const { name, departmentId } = req.body as {
    name?: string;
    departmentId?: string;
  };

  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!departmentId || typeof departmentId !== "string") {
    res.status(400).json({ error: "departmentId is required" });
    return;
  }

  const [dept] = await db
    .select()
    .from(departmentsTable)
    .where(
      and(
        eq(departmentsTable.id, departmentId),
        eq(departmentsTable.orgId, orgId),
      ),
    )
    .limit(1);

  if (!dept) {
    res.status(404).json({ error: "Department not found" });
    return;
  }

  const [st] = await db
    .insert(systemTypesTable)
    .values({ orgId, name: name.trim(), departmentId })
    .returning();

  res.status(201).json({ systemType: st });
});

// ---------------------------------------------------------------------------
// Sub-System Types
// ---------------------------------------------------------------------------

/**
 * GET /config/sub-system-types
 * Returns all sub-system types for the org. Optional ?systemTypeId= filter.
 */
router.get("/sub-system-types", async (req, res) => {
  const { orgId } = getSession(req);
  const { systemTypeId } = req.query as { systemTypeId?: string };

  const rows = await db
    .select()
    .from(subSystemTypesTable)
    .where(
      systemTypeId
        ? and(
            eq(subSystemTypesTable.orgId, orgId),
            eq(subSystemTypesTable.systemTypeId, systemTypeId),
          )
        : eq(subSystemTypesTable.orgId, orgId),
    );

  res.json({ subSystemTypes: rows });
});

/**
 * POST /config/sub-system-types
 * Body: { name, systemTypeId, lienWorkflowType } — lienWorkflowType REQUIRED (L05)
 */
router.post("/sub-system-types", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const { name, systemTypeId, lienWorkflowType } = req.body as {
    name?: string;
    systemTypeId?: string;
    lienWorkflowType?: string;
  };

  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!systemTypeId || typeof systemTypeId !== "string") {
    res.status(400).json({ error: "systemTypeId is required" });
    return;
  }
  if (!lienWorkflowType || typeof lienWorkflowType !== "string") {
    res.status(400).json({
      error:
        "lienWorkflowType is required — every sub-system type must declare its lien workflow (L05)",
    });
    return;
  }

  const validTypes = [
    "residential_sub",
    "commercial_sub",
    "public_bond",
    "none",
  ];
  if (!validTypes.includes(lienWorkflowType)) {
    res.status(400).json({
      error: `lienWorkflowType must be one of: ${validTypes.join(", ")}`,
    });
    return;
  }

  const [st] = await db
    .select()
    .from(systemTypesTable)
    .where(
      and(
        eq(systemTypesTable.id, systemTypeId),
        eq(systemTypesTable.orgId, orgId),
      ),
    )
    .limit(1);

  if (!st) {
    res.status(404).json({ error: "SystemType not found" });
    return;
  }

  const [sst] = await db
    .insert(subSystemTypesTable)
    .values({
      orgId,
      name: name.trim(),
      systemTypeId,
      lienWorkflowType: lienWorkflowType as
        | "residential_sub"
        | "commercial_sub"
        | "public_bond"
        | "none",
    })
    .returning();

  res.status(201).json({ subSystemType: sst });
});

/**
 * PATCH /config/sub-system-types/:id
 * Partial update: name, lienWorkflowType
 */
router.patch("/sub-system-types/:id", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const id = req.params.id as string;
  const { name, lienWorkflowType } = req.body as {
    name?: string;
    lienWorkflowType?: string;
  };

  const [existing] = await db
    .select()
    .from(subSystemTypesTable)
    .where(
      and(eq(subSystemTypesTable.id, id), eq(subSystemTypesTable.orgId, orgId)),
    )
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "SubSystemType not found" });
    return;
  }

  const validTypes = [
    "residential_sub",
    "commercial_sub",
    "public_bond",
    "none",
  ];

  if (
    lienWorkflowType !== undefined &&
    !validTypes.includes(lienWorkflowType)
  ) {
    res.status(400).json({
      error: `lienWorkflowType must be one of: ${validTypes.join(", ")}`,
    });
    return;
  }

  const setName = name !== undefined ? name.trim() : undefined;
  const setWorkflowType =
    lienWorkflowType !== undefined
      ? (lienWorkflowType as
          | "residential_sub"
          | "commercial_sub"
          | "public_bond"
          | "none")
      : undefined;

  if (setName === undefined && setWorkflowType === undefined) {
    res.status(400).json({ error: "No updatable fields provided" });
    return;
  }

  const [updated] = await db
    .update(subSystemTypesTable)
    .set({
      ...(setName !== undefined && { name: setName }),
      ...(setWorkflowType !== undefined && {
        lienWorkflowType: setWorkflowType,
      }),
    })
    .where(
      and(eq(subSystemTypesTable.id, id), eq(subSystemTypesTable.orgId, orgId)),
    )
    .returning();

  res.json({ subSystemType: updated });
});

// ---------------------------------------------------------------------------
// Stage Triggers
// ---------------------------------------------------------------------------

/**
 * GET /config/stage-triggers
 */
router.get("/stage-triggers", async (req, res) => {
  const { orgId } = getSession(req);
  const triggers = await db
    .select()
    .from(stageTriggerConfigsTable)
    .where(eq(stageTriggerConfigsTable.orgId, orgId));

  res.json({ stageTriggers: triggers });
});

/**
 * POST /config/stage-triggers
 * Body: { hubspotStageKey, label, lienClockTrigger }
 */
router.post("/stage-triggers", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const { hubspotStageKey, label, lienClockTrigger } = req.body as {
    hubspotStageKey?: string;
    label?: string;
    lienClockTrigger?: string;
  };

  if (!hubspotStageKey || typeof hubspotStageKey !== "string") {
    res.status(400).json({ error: "hubspotStageKey is required" });
    return;
  }
  if (!label || typeof label !== "string") {
    res.status(400).json({ error: "label is required" });
    return;
  }
  if (!lienClockTrigger || typeof lienClockTrigger !== "string") {
    res.status(400).json({ error: "lienClockTrigger is required" });
    return;
  }

  const validTriggers = ["none", "design_start", "field_work_start"];
  if (!validTriggers.includes(lienClockTrigger)) {
    res.status(400).json({
      error: `lienClockTrigger must be one of: ${validTriggers.join(", ")}`,
    });
    return;
  }

  const [trigger] = await db
    .insert(stageTriggerConfigsTable)
    .values({
      orgId,
      hubspotStageKey: hubspotStageKey.trim(),
      label: label.trim(),
      lienClockTrigger: lienClockTrigger as
        | "none"
        | "design_start"
        | "field_work_start",
    })
    .returning();

  res.status(201).json({ stageTrigger: trigger });
});

// ---------------------------------------------------------------------------
// Jurisdictions
// ---------------------------------------------------------------------------

/**
 * GET /config/jurisdictions
 * Returns jurisdictions with their rule sets.
 */
router.get("/jurisdictions", async (req, res) => {
  const { orgId } = getSession(req);
  const [jurisdictions, ruleSets] = await Promise.all([
    db
      .select()
      .from(jurisdictionsTable)
      .where(eq(jurisdictionsTable.orgId, orgId)),
    db
      .select()
      .from(lienRuleSetsTable)
      .where(eq(lienRuleSetsTable.orgId, orgId)),
  ]);

  const result = jurisdictions.map((j) => ({
    ...j,
    ruleSets: ruleSets.filter((rs) => rs.jurisdictionId === j.id),
  }));

  res.json({ jurisdictions: result });
});

/**
 * POST /config/jurisdictions
 * Body: { code, name }
 */
router.post("/jurisdictions", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const { code, name } = req.body as { code?: string; name?: string };

  if (!code || typeof code !== "string" || code.trim() === "") {
    res.status(400).json({ error: "code is required" });
    return;
  }
  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  const [jurisdiction] = await db
    .insert(jurisdictionsTable)
    .values({ orgId, code: code.trim().toUpperCase(), name: name.trim() })
    .returning();

  res.status(201).json({ jurisdiction });
});

// ---------------------------------------------------------------------------
// Rule Sets
// ---------------------------------------------------------------------------

/**
 * POST /config/rule-sets
 * Body: { jurisdictionId, version, effectiveDate, statuteRef }
 */
router.post("/rule-sets", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const { jurisdictionId, version, effectiveDate, statuteRef } = req.body as {
    jurisdictionId?: string;
    version?: string;
    effectiveDate?: string;
    statuteRef?: string;
  };

  if (!jurisdictionId) {
    res.status(400).json({ error: "jurisdictionId is required" });
    return;
  }
  if (!version || typeof version !== "string" || version.trim() === "") {
    res.status(400).json({ error: "version is required" });
    return;
  }
  if (!effectiveDate || isNaN(Date.parse(effectiveDate))) {
    res
      .status(400)
      .json({ error: "effectiveDate must be a valid ISO date string" });
    return;
  }
  if (
    !statuteRef ||
    typeof statuteRef !== "string" ||
    statuteRef.trim() === ""
  ) {
    res.status(400).json({ error: "statuteRef is required" });
    return;
  }

  const [jur] = await db
    .select()
    .from(jurisdictionsTable)
    .where(
      and(
        eq(jurisdictionsTable.id, jurisdictionId),
        eq(jurisdictionsTable.orgId, orgId),
      ),
    )
    .limit(1);

  if (!jur) {
    res.status(404).json({ error: "Jurisdiction not found" });
    return;
  }

  const [ruleSet] = await db
    .insert(lienRuleSetsTable)
    .values({
      orgId,
      jurisdictionId,
      version: version.trim(),
      effectiveDate: new Date(effectiveDate),
      statuteRef: statuteRef.trim(),
    })
    .returning();

  res.status(201).json({ ruleSet });
});

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * GET /config/rule-sets/:id/rules
 * Returns all rules for a given rule set.
 */
router.get("/rule-sets/:id/rules", async (req, res) => {
  const { orgId } = getSession(req);
  const { id } = req.params;

  const [rs] = await db
    .select()
    .from(lienRuleSetsTable)
    .where(
      and(eq(lienRuleSetsTable.id, id), eq(lienRuleSetsTable.orgId, orgId)),
    )
    .limit(1);

  if (!rs) {
    res.status(404).json({ error: "RuleSet not found" });
    return;
  }

  const rules = await db
    .select()
    .from(lienRulesTable)
    .where(
      and(eq(lienRulesTable.ruleSetId, id), eq(lienRulesTable.orgId, orgId)),
    );

  res.json({ rules });
});

/**
 * POST /config/rules
 * Full LienRule body.
 */
router.post("/rules", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const {
    ruleSetId,
    lienWorkflowType,
    workStream,
    ruleKind,
    anchor,
    offsetMonths,
    offsetDayOfMonth,
    offsetDays,
    offsetIsBusinessDays,
    businessDayHandling,
    statuteCitation,
    description,
  } = req.body as {
    ruleSetId?: string;
    lienWorkflowType?: string;
    workStream?: string;
    ruleKind?: string;
    anchor?: string;
    offsetMonths?: number;
    offsetDayOfMonth?: number;
    offsetDays?: number;
    offsetIsBusinessDays?: boolean;
    businessDayHandling?: string;
    statuteCitation?: string;
    description?: string;
  };

  if (!ruleSetId) {
    res.status(400).json({ error: "ruleSetId is required" });
    return;
  }
  if (!lienWorkflowType) {
    res.status(400).json({ error: "lienWorkflowType is required" });
    return;
  }
  if (!workStream) {
    res.status(400).json({ error: "workStream is required" });
    return;
  }
  if (!ruleKind) {
    res.status(400).json({ error: "ruleKind is required" });
    return;
  }
  if (!anchor) {
    res.status(400).json({ error: "anchor is required" });
    return;
  }
  if (!statuteCitation) {
    res.status(400).json({ error: "statuteCitation is required" });
    return;
  }
  if (!description) {
    res.status(400).json({ error: "description is required" });
    return;
  }

  const [rs] = await db
    .select()
    .from(lienRuleSetsTable)
    .where(
      and(
        eq(lienRuleSetsTable.id, ruleSetId),
        eq(lienRuleSetsTable.orgId, orgId),
      ),
    )
    .limit(1);

  if (!rs) {
    res.status(404).json({ error: "RuleSet not found" });
    return;
  }

  const [rule] = await db
    .insert(lienRulesTable)
    .values({
      orgId,
      ruleSetId,
      lienWorkflowType: lienWorkflowType as
        | "residential_sub"
        | "commercial_sub"
        | "public_bond"
        | "none",
      workStream: workStream as "construction" | "design",
      ruleKind: ruleKind as
        | "notice"
        | "filing"
        | "retainage"
        | "post_filing_notice"
        | "enforcement"
        | "release",
      anchor,
      offsetMonths: offsetMonths ?? null,
      offsetDayOfMonth: offsetDayOfMonth ?? null,
      offsetDays: offsetDays ?? null,
      offsetIsBusinessDays: offsetIsBusinessDays ?? false,
      businessDayHandling:
        (businessDayHandling as "next_business_day" | "exact" | undefined) ??
        "next_business_day",
      statuteCitation: statuteCitation.trim(),
      description: description.trim(),
    })
    .returning();

  res.status(201).json({ rule });
});

// ---------------------------------------------------------------------------
// Rule Set Review Gate
// ---------------------------------------------------------------------------

/**
 * PATCH /config/rule-sets/:id/review
 * Production gate: sets legalReviewed = true. Body: { legalReviewed: true }
 */
router.patch("/rule-sets/:id/review", requireAdmin, async (req, res) => {
  const { orgId } = getSession(req);
  const id = req.params.id as string;
  const { legalReviewed } = req.body as { legalReviewed?: unknown };

  if (legalReviewed !== true) {
    res.status(400).json({
      error: "legalReviewed must be true — this is a one-way production gate",
    });
    return;
  }

  const [existing] = await db
    .select()
    .from(lienRuleSetsTable)
    .where(
      and(eq(lienRuleSetsTable.id, id), eq(lienRuleSetsTable.orgId, orgId)),
    )
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "RuleSet not found" });
    return;
  }

  const [updated] = await db
    .update(lienRuleSetsTable)
    .set({ legalReviewed: true })
    .where(
      and(eq(lienRuleSetsTable.id, id), eq(lienRuleSetsTable.orgId, orgId)),
    )
    .returning();

  res.json({ ruleSet: updated });
});

/**
 * GET /config/qbo-status
 *
 * Returns whether QBO credentials are present in the environment.
 * The UI uses this to decide whether to show the Sync QBO button or a
 * "Not connected" message. No credential values are ever returned.
 */
router.get("/qbo-status", (_req, res) => {
  const connected = !!(
    process.env.QBO_CLIENT_ID &&
    process.env.QBO_CLIENT_SECRET &&
    process.env.QBO_REFRESH_TOKEN &&
    process.env.QBO_REALM_ID
  );
  res.json({ connected });
});

/**
 * GET /config/hubspot-status
 *
 * Returns whether a HubSpot API key is present in the environment.
 * The UI uses this to show connection status. No credential values are returned.
 */
router.get("/hubspot-status", (_req, res) => {
  const connected = !!process.env.HUBSPOT_API_KEY;
  res.json({ connected });
});

export default router;
