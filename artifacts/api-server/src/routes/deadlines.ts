/**
 * deadlines.ts — routes for LienDeadline lookup.
 *
 * GET /deadlines/:workMonthId   list all deadlines for a work month (with sourceData)
 */

import { Router } from "express";
import { db } from "@workspace/db";
import {
  lienDeadlinesTable,
  workMonthsTable,
  lienStreamsTable,
  lienRulesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";

const router = Router();
router.use(requireSession);

/**
 * GET /deadlines/:workMonthId
 *
 * Returns all deadlines for a work month with embedded rule metadata
 * (statute citation, description) so the UI can show source traceability (L13).
 */
router.get("/deadlines/:workMonthId", async (req, res) => {
  const { orgId } = getSession(req);
  const { workMonthId } = req.params;

  // Verify work month belongs to this org (via stream)
  const [wm] = await db
    .select()
    .from(workMonthsTable)
    .where(and(eq(workMonthsTable.id, workMonthId), eq(workMonthsTable.orgId, orgId)));

  if (!wm) return res.status(404).json({ error: "Work month not found" });

  const deadlines = await db
    .select()
    .from(lienDeadlinesTable)
    .where(
      and(
        eq(lienDeadlinesTable.workMonthId, workMonthId),
        eq(lienDeadlinesTable.orgId, orgId),
      ),
    );

  // Enrich with rule metadata for source traceability
  const enriched = await Promise.all(
    deadlines.map(async (dl) => {
      const [rule] = await db
        .select({
          statuteCitation: lienRulesTable.statuteCitation,
          description: lienRulesTable.description,
          ruleKind: lienRulesTable.ruleKind,
        })
        .from(lienRulesTable)
        .where(eq(lienRulesTable.id, dl.ruleId));
      return {
        ...dl,
        rule: rule ?? null,
      };
    }),
  );

  return res.json({ workMonth: wm, deadlines: enriched });
});

export default router;
