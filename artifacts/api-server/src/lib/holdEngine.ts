/**
 * holdEngine.ts
 *
 * Recomputes payment holds for an org. Holds are **bill-based**: each hold
 * withholds payment on one specific vendor bill (supplier invoice), connected by
 * the vendor bill reference (invoiceLinks.id / qboSupplierInvoiceId). We only ever
 * hold uncleared vendor bills — bills already paid/settled are never held (e.g. if
 * the design scope has been paid, its design vendor bills are not held).
 *
 * Two triggers decide which vendor bills get held:
 *
 * Schedule Hold (hold_type=schedule_hold):
 *   Hold each uncleared vendor bill on a project that has ≥1 non-supplier,
 *   uncleared invoice whose dueDate < now (a past-due receivable on that project).
 *
 * Material Hold (hold_type=material_hold):
 *   Hold each uncleared vendor bill for a client whose CollectionAccount.totalOverdue
 *   exceeds MATERIAL_HOLD_THRESHOLD_USD (default $0 — any overdue).
 *
 * The engine only manages bill-based holds (supplierInvoiceId set). Legacy/manual
 * holds with a null supplierInvoiceId (project- or client-wide) are left untouched.
 *
 * The entire pass runs in a single DB transaction: either all changes commit
 * or none do, preventing partial hold state on failure.
 */

import { db } from "@workspace/db";
import {
  holdsTable,
  invoiceLinksTable,
  collectionAccountsTable,
} from "@workspace/db";
import { eq, and, isNull, lt, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";

/** USD threshold above which a client's overdue balance triggers a Material Hold. */
function getMaterialHoldThreshold(): number {
  const raw = process.env.MATERIAL_HOLD_THRESHOLD_USD;
  if (raw !== undefined) {
    const parsed = parseFloat(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error(`MATERIAL_HOLD_THRESHOLD_USD must be a non-negative number, got "${raw}"`);
    }
    return parsed;
  }
  return 0; // default: any overdue balance triggers a hold
}

export interface HoldRecomputeResult {
  set: number;
  cleared: number;
}

type HoldType = "schedule_hold" | "material_hold";

export async function recomputeHolds(orgId: string): Promise<HoldRecomputeResult> {
  const now = new Date();
  const materialThreshold = getMaterialHoldThreshold();
  let set = 0;
  let cleared = 0;

  await db.transaction(async (tx) => {
    // -------------------------------------------------------------------------
    // Triggers
    // -------------------------------------------------------------------------

    // Projects with a past-due receivable (non-supplier, uncleared, dueDate < now).
    const overdueInvoiceRows = await tx
      .select({ lienProjectId: invoiceLinksTable.lienProjectId })
      .from(invoiceLinksTable)
      .where(
        and(
          eq(invoiceLinksTable.orgId, orgId),
          eq(invoiceLinksTable.isSupplierInvoice, false),
          eq(invoiceLinksTable.clearedFlag, false),
          lt(invoiceLinksTable.dueDate, now),
        ),
      );

    const overdueProjectIds = new Set(
      overdueInvoiceRows
        .map((r) => r.lienProjectId)
        .filter((id): id is string => id !== null && id !== undefined),
    );

    // Clients whose overdue balance exceeds the material-hold threshold.
    const accounts = await tx
      .select({
        linkedClientId: collectionAccountsTable.linkedClientId,
        totalOverdue: collectionAccountsTable.totalOverdue,
      })
      .from(collectionAccountsTable)
      .where(eq(collectionAccountsTable.orgId, orgId));

    const overThresholdClientIds = new Set(
      accounts
        .filter((a) => parseFloat(a.totalOverdue ?? "0") > materialThreshold)
        .map((a) => a.linkedClientId),
    );

    const clientOverdueAmount = new Map(
      accounts.map((a) => [a.linkedClientId, parseFloat(a.totalOverdue ?? "0")]),
    );

    // -------------------------------------------------------------------------
    // Vendor bills (supplier invoices) — the things we actually hold
    // -------------------------------------------------------------------------

    const vendorBills = await tx
      .select({
        id: invoiceLinksTable.id,
        lienProjectId: invoiceLinksTable.lienProjectId,
        linkedClientId: invoiceLinksTable.linkedClientId,
        clearedFlag: invoiceLinksTable.clearedFlag,
      })
      .from(invoiceLinksTable)
      .where(
        and(
          eq(invoiceLinksTable.orgId, orgId),
          eq(invoiceLinksTable.isSupplierInvoice, true),
        ),
      );

    // Index of currently active bill-based holds keyed by `${holdType}|${billId}`.
    const activeBillHolds = await tx
      .select({
        id: holdsTable.id,
        holdType: holdsTable.holdType,
        supplierInvoiceId: holdsTable.supplierInvoiceId,
      })
      .from(holdsTable)
      .where(
        and(
          eq(holdsTable.orgId, orgId),
          isNull(holdsTable.clearedAt),
          isNotNull(holdsTable.supplierInvoiceId),
        ),
      );

    const activeByKey = new Map<string, string>();
    for (const h of activeBillHolds) {
      activeByKey.set(`${h.holdType}|${h.supplierInvoiceId}`, h.id);
    }

    // Track which active holds remain justified this pass so we can clear the rest.
    const stillJustified = new Set<string>();

    const ensureHold = async (
      holdType: HoldType,
      bill: { id: string; lienProjectId: string | null; linkedClientId: string | null },
      reason: string,
    ) => {
      const key = `${holdType}|${bill.id}`;
      stillJustified.add(key);
      if (activeByKey.has(key)) return; // already held
      await tx.insert(holdsTable).values({
        id: randomUUID(),
        orgId,
        holdType,
        lienProjectId: bill.lienProjectId,
        linkedClientId: bill.linkedClientId,
        supplierInvoiceId: bill.id,
        reason,
        setAt: now,
      });
      set++;
    };

    for (const bill of vendorBills) {
      if (bill.clearedFlag) continue; // never hold an already-paid vendor bill

      if (bill.lienProjectId && overdueProjectIds.has(bill.lienProjectId)) {
        await ensureHold("schedule_hold", bill, "Vendor payment withheld — project has a past-due receivable");
      }

      if (bill.linkedClientId && overThresholdClientIds.has(bill.linkedClientId)) {
        const overdue = clientOverdueAmount.get(bill.linkedClientId) ?? 0;
        await ensureHold(
          "material_hold",
          bill,
          `Vendor payment withheld — client overdue balance $${overdue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} exceeds threshold $${materialThreshold.toFixed(2)}`,
        );
      }
    }

    // Clear bill-based holds that are no longer justified (bill paid, project no
    // longer overdue, or client back under threshold).
    for (const [key, holdId] of activeByKey) {
      if (stillJustified.has(key)) continue;
      await tx
        .update(holdsTable)
        .set({ clearedAt: now, updatedAt: now })
        .where(eq(holdsTable.id, holdId));
      cleared++;
    }
  });

  return { set, cleared };
}
