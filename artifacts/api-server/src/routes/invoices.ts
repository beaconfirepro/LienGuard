/**
 * invoices.ts — coordinator invoice management routes.
 *
 * POST /invoices/:id/clear   coordinator marks an invoice as cleared
 * GET  /invoices             list invoices for the org (by project)
 */

import { Router } from "express";
import { db } from "@workspace/db";
import {
  invoiceLinksTable,
  collectionAccountsTable,
  promisesToPayTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireSession, getSession } from "../lib/session";

const router = Router();
router.use(requireSession);

/**
 * GET /invoices?projectId=
 */
router.get("/invoices", async (req, res) => {
  const { orgId } = getSession(req);
  const { projectId } = req.query as { projectId?: string };

  const conditions = [eq(invoiceLinksTable.orgId, orgId)];
  if (projectId) {
    conditions.push(eq(invoiceLinksTable.lienProjectId, projectId));
  }

  const invoices = await db
    .select()
    .from(invoiceLinksTable)
    .where(and(...conditions));

  return res.json({ invoices });
});

/**
 * POST /invoices/:id/clear
 *
 * Coordinator confirms an invoice is cleared (paid + received).
 * This is distinct from QBO status — QBO may say "open" while coordinator
 * has confirmed receipt, or vice versa.
 *
 * After clearing, the linked collection account's risk score is recomputed
 * so the call queue and dashboard reflect fresh overdue data.
 */
router.post("/invoices/:id/clear", async (req, res) => {
  const { orgId } = getSession(req);
  const { id } = req.params;
  const { clearedFlag } = req.body as { clearedFlag?: boolean };

  if (clearedFlag === undefined) {
    return res.status(400).json({ error: "clearedFlag is required" });
  }

  const [invoice] = await db
    .select()
    .from(invoiceLinksTable)
    .where(and(eq(invoiceLinksTable.id, id), eq(invoiceLinksTable.orgId, orgId)));

  if (!invoice) return res.status(404).json({ error: "Invoice not found" });

  const userId = req.sessionData?.userId ?? null;
  const now = new Date();

  const [updated] = await db
    .update(invoiceLinksTable)
    .set({
      clearedFlag,
      clearedAt: clearedFlag ? now : null,
      clearedByUserId: clearedFlag ? userId : null,
      updatedAt: now,
    })
    .where(eq(invoiceLinksTable.id, id))
    .returning();

  // Recompute risk score for the linked collection account so overdue totals
  // and call-queue ordering reflect the cleared invoice immediately.
  if (invoice.linkedClientId) {
    const [account] = await db
      .select()
      .from(collectionAccountsTable)
      .where(
        and(
          eq(collectionAccountsTable.orgId, orgId),
          eq(collectionAccountsTable.linkedClientId, invoice.linkedClientId),
        ),
      )
      .limit(1);

    if (account) {
      await recomputeRiskScoreForAccount(account, orgId);
    }
  }

  return res.json({ invoice: updated });
});

// ---------------------------------------------------------------------------
// Inline risk recomputation (mirrors collections.ts logic without a shared
// module import — keeps invoices.ts self-contained while ensuring the score
// stays fresh after a payment clear).
// ---------------------------------------------------------------------------
async function recomputeRiskScoreForAccount(
  account: typeof collectionAccountsTable.$inferSelect,
  orgId: string,
): Promise<void> {
  const today = new Date();

  const unpaidInvoices = await db
    .select()
    .from(invoiceLinksTable)
    .where(
      and(
        eq(invoiceLinksTable.orgId, orgId),
        eq(invoiceLinksTable.linkedClientId, account.linkedClientId),
        eq(invoiceLinksTable.clearedFlag, false),
      ),
    );

  const overdueInvoices = unpaidInvoices.filter(
    (inv) => new Date(inv.dueDate) < today,
  );

  const totalOverdue = overdueInvoices.reduce(
    (sum, inv) => sum + Number(inv.amount),
    0,
  );

  const oldestOverdueDays =
    overdueInvoices.length > 0
      ? Math.max(
          ...overdueInvoices.map((inv) =>
            Math.floor(
              (today.getTime() - new Date(inv.dueDate).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          ),
        )
      : 0;

  const brokenPromises = await db
    .select()
    .from(promisesToPayTable)
    .where(
      and(
        eq(promisesToPayTable.orgId, orgId),
        eq(promisesToPayTable.accountId, account.id),
        eq(promisesToPayTable.status, "broken"),
      ),
    );

  let agePts = 0;
  if (oldestOverdueDays > 90) agePts = 40;
  else if (oldestOverdueDays > 60) agePts = 28;
  else if (oldestOverdueDays > 30) agePts = 16;
  else if (oldestOverdueDays > 0) agePts = 6;

  const stagePts: Record<string, number> = {
    none: 0,
    soft_collections: 8,
    pre_lien_notice: 18,
    lien_filing: 28,
    agency_attorney: 35,
    write_off: 35,
  };
  const escalationPts = stagePts[account.escalationStage] ?? 0;
  const brokenPts = Math.min(brokenPromises.length * 5, 15);

  let exposurePts = 0;
  if (totalOverdue > 50000) exposurePts = 10;
  else if (totalOverdue > 25000) exposurePts = 7;
  else if (totalOverdue > 10000) exposurePts = 4;
  else if (totalOverdue > 2500) exposurePts = 2;

  const riskScore = Math.min(agePts + escalationPts + brokenPts + exposurePts, 100);

  // If all invoices are now cleared → resolve account to "current"
  const newStatus =
    overdueInvoices.length === 0 && account.status !== "written_off"
      ? "current"
      : account.status;

  await db
    .update(collectionAccountsTable)
    .set({
      riskScore,
      oldestOverdueDays,
      totalOverdue: String(totalOverdue),
      status: newStatus as typeof account.status,
    })
    .where(
      and(
        eq(collectionAccountsTable.id, account.id),
        eq(collectionAccountsTable.orgId, orgId),
      ),
    );
}

export default router;
