import { money } from "@/lib/utils";

/**
 * NoticePreview (C-08) — statutory-form preview for § 53.056 / § 53.057.
 */
export default function NoticePreview({ company = "Beacon Fire Protection", project, month, amount, section = "53.056" }) {
  return (
    <div className="rounded-lg border border-border p-[18px] font-mono text-[11.5px] leading-relaxed text-text-dim" style={{ background: "#0f1117" }}>
      <div className="mb-2.5 text-[10px] uppercase tracking-wide text-text-muted">
        Tex. Prop. Code § {section} — Notice to Owner &amp; Original Contractor
      </div>
      This notice is to advise you that <span className="text-text">{company}</span> has furnished labor and
      materials for fire-protection work at <span className="text-text">{project}</span>. The unpaid balance for
      work performed in <span className="text-text">{month}</span> is <span className="text-text">{money(amount)}</span>.
      If this balance is not paid, the property may be subject to a mechanic's lien.
    </div>
  );
}
