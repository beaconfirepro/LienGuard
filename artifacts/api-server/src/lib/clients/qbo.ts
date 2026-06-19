/**
 * QboClient — Phase 0 fixture stub.
 *
 * Returns canned invoice data for development. Replace with real QBO
 * OAuth + API calls in Phase 3.
 */

export interface QboInvoice {
  qboInvoiceId: string;
  qboCustomerId: string;
  amount: number;
  invoiceDate: Date;
  dueDate: Date;
  status: string;
  isSupplierInvoice: boolean;
  qboSupplierInvoiceId?: string;
  hubspotProjectId?: string;
}

const FIXTURE_INVOICES: QboInvoice[] = [
  {
    qboInvoiceId: "qbo_inv_1",
    qboCustomerId: "qbo_cust_200",
    amount: 48250.0,
    invoiceDate: new Date("2026-03-05"),
    dueDate: new Date("2026-04-04"),
    status: "open",
    isSupplierInvoice: false,
    hubspotProjectId: "hs_proj_900",
  },
  {
    qboInvoiceId: "qbo_inv_2",
    qboCustomerId: "qbo_cust_100",
    amount: 12000.0,
    invoiceDate: new Date("2026-03-01"),
    dueDate: new Date("2026-03-31"),
    status: "paid",
    isSupplierInvoice: false,
    hubspotProjectId: "hs_proj_902",
  },
  {
    qboInvoiceId: "qbo_sup_1",
    qboCustomerId: "",
    amount: 9000.0,
    invoiceDate: new Date("2026-03-02"),
    dueDate: new Date("2026-04-01"),
    status: "open",
    isSupplierInvoice: true,
    qboSupplierInvoiceId: "qbo_sup_1",
    hubspotProjectId: "hs_proj_900",
  },
];

export class QboClient {
  async getInvoicesByProject(hubspotProjectId: string): Promise<QboInvoice[]> {
    return FIXTURE_INVOICES.filter((i) => i.hubspotProjectId === hubspotProjectId);
  }

  async getAllInvoices(): Promise<QboInvoice[]> {
    return FIXTURE_INVOICES;
  }

  async getInvoice(qboInvoiceId: string): Promise<QboInvoice | null> {
    return FIXTURE_INVOICES.find((i) => i.qboInvoiceId === qboInvoiceId) ?? null;
  }
}

export const qboClient = new QboClient();
