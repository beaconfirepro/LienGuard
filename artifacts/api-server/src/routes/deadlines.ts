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
  lienScheduleOfValuesTable,
  lienRulesTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";
import { requireAdminOrPm } from "../lib/admin";

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

/**
 * PATCH /deadlines/:id/override
 *
 * Set or clear a manual override on a single computed deadline. Jurisdiction
 * rules are standards/starting points — authorized users (admin/pm) may
 * override an individual deadline with a manual date. The override persists and
 * is NOT wiped when the stream is recomputed.
 *
 * Body to set:   { overrideDate: "YYYY-MM-DD" | ISO date }
 * Body to clear: { overrideDate: null }
 */
router.patch("/deadlines/:id/override", requireAdminOrPm, async (req, res) => {
  const { orgId, userId } = getSession(req);
  const id = req.params["id"] as string;
  const { overrideDate } = req.body as { overrideDate?: unknown };

  const [existing] = await db
    .select()
    .from(lienDeadlinesTable)
    .where(and(eq(lienDeadlinesTable.id, id), eq(lienDeadlinesTable.orgId, orgId)))
    .limit(1);

  if (!existing) {
    return res.status(404).json({ error: "Deadline not found" });
  }

  // Clear the override → revert to the computed/adjusted date
  if (overrideDate === null) {
    const [updated] = await db
      .update(lienDeadlinesTable)
      .set({
        isOverridden: false,
        overrideDate: null,
        overrideByUserId: null,
        overrideAt: null,
        updatedAt: new Date(),
      })
      .where(and(eq(lienDeadlinesTable.id, id), eq(lienDeadlinesTable.orgId, orgId)))
      .returning();
    return res.json({ deadline: updated });
  }

  // Set the override
  if (typeof overrideDate !== "string" || overrideDate.trim() === "") {
    return res
      .status(400)
      .json({ error: "overrideDate must be a date string, or null to clear the override" });
  }

  const parsed = new Date(overrideDate);
  if (Number.isNaN(parsed.getTime())) {
    return res.status(400).json({ error: "overrideDate is not a valid date" });
  }

  const [updated] = await db
    .update(lienDeadlinesTable)
    .set({
      isOverridden: true,
      overrideDate: parsed,
      overrideByUserId: userId ?? null,
      overrideAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(lienDeadlinesTable.id, id), eq(lienDeadlinesTable.orgId, orgId)))
    .returning();

  return res.json({ deadline: updated });
});

export default router;
