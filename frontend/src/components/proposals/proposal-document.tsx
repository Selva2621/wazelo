import type { ProposalItem, ProposalTotals } from "@/lib/api/proposals";
import { cn } from "@/lib/utils";

export interface ProposalDocumentData {
  number: string;
  title: string;
  intro: string | null;
  scope: string[];
  items: ProposalItem[];
  taxPercent: number;
  currency: string;
  totals: ProposalTotals;
  terms: string | null;
  validUntil: string | null;
  issuedAt: string | null;
  clientName: string | null;
  businessName: string;
  businessWebsite?: string | null;
}

/** ₹35,400 · ₹99.99 · $1,200.50 */
export function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

const date = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : null;

/**
 * The proposal as the client sees it: a clean one-page quote. Used by the
 * editor's live preview and the public /p/:token page (and its print/PDF).
 */
export function ProposalDocument({ data, className }: { data: ProposalDocumentData; className?: string }) {
  const { totals, currency } = data;
  const issued = date(data.issuedAt);
  const valid = date(data.validUntil);
  const hasNumbers = data.items.length > 0;

  return (
    <article className={cn("bg-white text-[#1f2328] print:shadow-none", className)}>
      <header className="flex items-start justify-between gap-4 border-b border-[#e6e8eb] pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#1f2328] text-base font-semibold text-white"
          >
            {data.businessName.trim().charAt(0).toUpperCase() || "W"}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{data.businessName}</p>
            {data.businessWebsite && (
              <p className="truncate text-sm text-[#59636e]">{data.businessWebsite.replace(/^https?:\/\//, "").replace(/\/$/, "")}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right text-sm text-[#59636e]">
          <p className="font-medium text-[#1f2328]">Proposal {data.number}</p>
          {issued && <p>{issued}</p>}
        </div>
      </header>

      <section className="space-y-2 py-6">
        {data.clientName && <p className="text-sm text-[#59636e]">For {data.clientName}</p>}
        <h1 className="text-2xl font-semibold leading-tight text-balance">{data.title || "Untitled proposal"}</h1>
        {data.intro && <p className="whitespace-pre-line leading-relaxed text-[#31373d]">{data.intro}</p>}
      </section>

      {data.scope.length > 0 && (
        <section className="space-y-3 border-t border-[#e6e8eb] py-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#59636e]">What&apos;s included</h2>
          <ul className="space-y-2">
            {data.scope.map((s, i) => (
              <li key={i} className="flex gap-2.5 leading-relaxed">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-[#1f2328]" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 border-t border-[#e6e8eb] py-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#59636e]">Price</h2>
        {hasNumbers ? (
          <table className="w-full text-sm">
            <caption className="sr-only">Price breakdown</caption>
            <thead>
              <tr className="text-left text-[#59636e]">
                <th scope="col" className="pb-2 font-medium">Item</th>
                <th scope="col" className="pb-2 text-right font-medium">Qty</th>
                <th scope="col" className="pb-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, i) => (
                <tr key={i} className="border-t border-[#eef0f2] align-top">
                  <td className="py-2.5 pr-3">
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-[#59636e]">{item.description}</p>}
                    {item.quantity !== 1 && (
                      <p className="text-[#59636e]">{money(item.unitPrice, currency)} each</p>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="py-2.5 pl-3 text-right tabular-nums">
                    {item.unitPrice > 0 ? money(item.quantity * item.unitPrice, currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="tabular-nums">
              {(totals.discount > 0 || totals.tax > 0) && (
                <tr className="border-t border-[#e6e8eb]">
                  <td colSpan={2} className="pt-3 text-[#59636e]">Subtotal</td>
                  <td className="pt-3 text-right">{money(totals.subtotal, currency)}</td>
                </tr>
              )}
              {totals.discount > 0 && (
                <tr>
                  <td colSpan={2} className="pt-1 text-[#59636e]">Discount</td>
                  <td className="pt-1 text-right">−{money(totals.discount, currency)}</td>
                </tr>
              )}
              {totals.tax > 0 && (
                <tr>
                  <td colSpan={2} className="pt-1 text-[#59636e]">Tax ({data.taxPercent}%)</td>
                  <td className="pt-1 text-right">{money(totals.tax, currency)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-[#1f2328] text-base font-semibold">
                <td colSpan={2} className="pt-3">Total</td>
                <td className="pt-3 text-right">{money(totals.total, currency)}</td>
              </tr>
            </tfoot>
          </table>
        ) : (
          <p className="text-sm text-[#59636e]">No items yet.</p>
        )}
        {valid && <p className="text-sm text-[#59636e]">Valid till {valid}</p>}
      </section>

      {data.terms && (
        <section className="space-y-2 border-t border-[#e6e8eb] py-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[#59636e]">Terms</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[#31373d]">{data.terms}</p>
        </section>
      )}
    </article>
  );
}
