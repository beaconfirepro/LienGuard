/**
 * holdEngine.ts
 *
 * Recomputes Schedule Hold and Material Hold flags for an org.
 *
 * Schedule Hold (hold_type=schedule_hold, scoped to LienProject):
 *   Any project with ≥1 non-supplier, uncleared invoice whose dueDate < now.
 *
 * Material Hold (hold_type=material_hold, scoped to LinkedClient):
 *   Any client whose CollectionAccount.totalOverdue > MATERIAL_HOLD_THRESHOLD_USD.
 *   Threshold defaults to $0 (any overdue); set env var to override.
 *
 * The entire pass runs in a single DB transaction: either all changes commit
 * or none do, preventing partial hold state on failure.
 */

import { db } from "@workspace/db";
import {
  holdsTable,
  invoiceLinksTable,
  lienProjectsTable,
  collectionAccountsTable,
} from "@workspace/db";
import { eq, and, isNull, lt } from "drizzle-orm";
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

export async function recomputeHolds(orgId: string): Promise<HoldRecomputeResult> {
  const now = new Date();
  const materialThreshold = getMaterialHoldThreshold();
  let set = 0;
  let cleared = 0;

  await db.transaction(async (tx) => {
    // -------------------------------------------------------------------------
    // Schedule Holds — per project
    // -------------------------------------------------------------------------

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

    const allProjects = await tx
      .select({ id: lienProjectsTable.id })
      .from(lienProjectsTable)
      .where(eq(lienProjectsTable.orgId, orgId));

    for (const project of allProjects) {
      const hasOverdue = overdueProjectIds.has(project.id);

      const existing = await tx
        .select({ id: holdsTable.id })
        .from(holdsTable)
        .where(
          and(
            eq(holdsTable.orgId, orgId),
            eq(holdsTable.holdType, "schedule_hold"),
            eq(holdsTable.lienProjectId, project.id),
            isNull(holdsTable.clearedAt),
          ),
        )
        .limit(1);

      if (hasOverdue && existing.length === 0) {
        await tx.insert(holdsTable).values({
          id: randomUUID(),
          orgId,
          holdType: "schedule_hold",
          lienProjectId: project.id,
          reason: "Invoice past due per payment terms",
          setAt: now,
        });
        set++;
      } else if (!hasOverdue && existing.length > 0) {
        await tx
          .update(holdsTable)
          .set({ clearedAt: now, updatedAt: now })
          .where(eq(holdsTable.id, existing[0].id));
        cleared++;
      }
    }

    // -------------------------------------------------------------------------
    // Material Holds — per linked client
    // -------------------------------------------------------------------------

    const accounts = await tx
      .select({
        linkedClientId: collectionAccountsTable.linkedClientId,
        totalOverdue: collectionAccountsTable.totalOverdue,
      })
      .from(collectionAccountsTable)
      .where(eq(collectionAccountsTable.orgId, orgId));

    for (const acct of accounts) {
      const overdueBalance = parseFloat(acct.totalOverdue ?? "0");
      const isOverdue = overdueBalance > materialThreshold;

      const existing = await tx
        .select({ id: holdsTable.id })
        .from(holdsTable)
        .where(
          and(
            eq(holdsTable.orgId, orgId),
            eq(holdsTable.holdType, "material_hold"),
            eq(holdsTable.linkedClientId, acct.linkedClientId),
            isNull(holdsTable.clearedAt),
          ),
        )
        .limit(1);

      if (isOverdue && existing.length === 0) {
        await tx.insert(holdsTable).values({
          id: randomUUID(),
          orgId,
          holdType: "material_hold",
          linkedClientId: acct.linkedClientId,
          reason: `Client overdue balance $${overdueBalance.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} exceeds threshold $${materialThreshold.toFixed(2)}`,
          setAt: now,
        });
        set++;
      } else if (!isOverdue && existing.length > 0) {
        await tx
          .update(holdsTable)
          .set({ clearedAt: now, updatedAt: now })
          .where(eq(holdsTable.id, existing[0].id));
        cleared++;
      }
    }
  });

  return { set, cleared };
}
