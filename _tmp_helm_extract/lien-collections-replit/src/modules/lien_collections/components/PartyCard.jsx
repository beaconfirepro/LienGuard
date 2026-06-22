/**
 * PartyCard (C-04) — owner / GC / hiring party with cached legal name + address.
 */
export default function PartyCard({ role, name, address }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3 px-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-wider text-text-muted">{role}</div>
      <div className="mt-1 text-[13.5px] font-semibold text-text">{name}</div>
      {address && <div className="mt-0.5 text-[11.5px] text-text-dim">{address}</div>}
    </div>
  );
}
