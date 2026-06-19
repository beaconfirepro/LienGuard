import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  departmentsTable,
  systemTypesTable,
  subSystemTypesTable,
  stageTriggerConfigsTable,
  holdsTable,
  lienProjectsTable,
  linkedClientsTable,
} from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";
import { requireServiceKey } from "../lib/serviceKey";

const router: IRouter = Router();

/**
 * GET /external/reference
 *
 * Returns the full reference tree (Dept → SystemType → SubSystemType)
 * plus stage-trigger configs for all orgs (Helm Core doesn't scope by org —
 * it reads a combined catalogue). Service-key authenticated.
 *
 * Phase 0: returns fixture/seeded data. Full implementation in Phase 1.
 */
router.get("/external/reference", requireServiceKey, async (_req, res) => {
  try {
    const [departments, systemTypes, subSystemTypes, stageTriggers] = await Promise.all([
      db.select().from(departmentsTable),
      db.select().from(systemTypesTable),
      db.select().from(subSystemTypesTable),
      db.select().from(stageTriggerConfigsTable),
    ]);

    const tree = departments.map((dept) => ({
      ...dept,
      systemTypes: systemTypes
        .filter((st) => st.departmentId === dept.id)
        .map((st) => ({
          ...st,
          subSystemTypes: subSystemTypes.filter((sst) => sst.systemTypeId === st.id),
        })),
    }));

    res.json({
      departments: tree,
      stageTriggers,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to load reference data" });
  }
});

/**
 * GET /external/holds
 *
 * Returns all active (not cleared) holds for Helm Core to consume.
 * Used to block scheduling and material orders. Service-key authenticated.
 *
 * Phase 0: returns seeded holds. Hold computation engine built in Phase 3.
 */
router.get("/external/holds", requireServiceKey, async (_req, res) => {
  try {
    const activeHolds = await db
      .select({
        id: holdsTable.id,
        orgId: holdsTable.orgId,
        holdType: holdsTable.holdType,
        lienProjectId: holdsTable.lienProjectId,
        linkedClientId: holdsTable.linkedClientId,
        reason: holdsTable.reason,
        setAt: holdsTable.setAt,
        createdAt: holdsTable.createdAt,
        projectName: lienProjectsTable.cachedProjectName,
        clientName: linkedClientsTable.cachedName,
        hubspotProjectId: lienProjectsTable.hubspotProjectId,
        hubspotCompanyId: linkedClientsTable.hubspotCompanyId,
      })
      .from(holdsTable)
      .leftJoin(lienProjectsTable, eq(holdsTable.lienProjectId, lienProjectsTable.id))
      .leftJoin(linkedClientsTable, eq(holdsTable.linkedClientId, linkedClientsTable.id))
      .where(isNull(holdsTable.clearedAt));

    res.json({ holds: activeHolds });
  } catch (err) {
    res.status(500).json({ error: "Failed to load holds" });
  }
});

export default router;
