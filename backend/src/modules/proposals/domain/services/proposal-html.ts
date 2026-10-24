import { ProposalItem, ProposalTotals } from './proposal-math';

export interface ProposalDocument {
  number: string;
  title: string;
  intro: string | null;
  scope: string[];
  items: ProposalItem[];
  taxPercent: number;
  currency: string;
  totals: ProposalTotals;
  terms: string | null;
  validUntil: Date | null;
  issuedAt: Date;
  clientName: string | null;
  businessName: string;
  businessWebsite: string | null;
  /** Dates are printed in the business's timezone (default UTC) */
  timeZone?: string;
  /** Shown as a stamp when the client accepted */
  acceptedBy?: string | null;
  acceptedAt?: Date | null;
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** Escaped, with line breaks kept */
const text = (s: string) => esc(s).replace(/\r?\n/g, '<br>');

/** ₹35,400 · ₹99.99 · $1,200.50 */
export function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

function dayIn(timeZone: string) {
  return (d: Date) => {
    try {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone });
    } catch {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    }
  };
}

/**
 * The proposal as a standalone HTML page for the PDF: same layout as the
 * client's /p/:token page. Everything user-written is escaped.
 */
export function renderProposalHtml(d: ProposalDocument): string {
  const c = d.currency;
  const t = d.totals;
  const website = d.businessWebsite?.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const initial = d.businessName.trim().charAt(0).toUpperCase() || 'W';
  const day = dayIn(d.timeZone || 'UTC');

  const rows = d.items
    .map(
      (i) => `<tr>
        <td><div class="item">${esc(i.name)}</div>${i.description ? `<div class="muted">${esc(i.description)}</div>` : ''}${
          i.quantity !== 1 ? `<div class="muted">${esc(money(i.unitPrice, c))} each</div>` : ''
        }</td>
        <td class="num">${i.quantity}</td>
        <td class="num">${i.unitPrice > 0 ? esc(money(i.quantity * i.unitPrice, c)) : '—'}</td>
      </tr>`,
    )
    .join('');

  const subtotalRows = [
    t.discount > 0 || t.tax > 0 ? `<tr class="sub"><td colspan="2">Subtotal</td><td class="num">${esc(money(t.subtotal, c))}</td></tr>` : '',
    t.discount > 0 ? `<tr class="sub"><td colspan="2">Discount</td><td class="num">−${esc(money(t.discount, c))}</td></tr>` : '',
    t.tax > 0 ? `<tr class="sub"><td colspan="2">Tax (${d.taxPercent}%)</td><td class="num">${esc(money(t.tax, c))}</td></tr>` : '',
  ].join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Proposal ${esc(d.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; color: #1f2328; font: 14px/1.55 "Segoe UI", Roboto, "Noto Sans", "Noto Sans Tamil", "Nirmala UI", "Latha", Arial, sans-serif; }
  .muted { color: #59636e; }
  header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding-bottom: 18px; border-bottom: 1px solid #e6e8eb; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .logo { width: 40px; height: 40px; border-radius: 8px; background: #1f2328; color: #fff; font-weight: 600; font-size: 17px; display: flex; align-items: center; justify-content: center; }
  .bname { font-weight: 600; font-size: 15px; }
  .meta { text-align: right; font-size: 13px; }
  .meta b { color: #1f2328; font-weight: 600; }
  section { padding: 20px 0; border-top: 1px solid #e6e8eb; break-inside: avoid; }
  section.first { border-top: 0; }
  h1 { font-size: 24px; line-height: 1.25; margin: 4px 0 8px; }
  h2 { font-size: 12px; letter-spacing: .06em; text-transform: uppercase; color: #59636e; margin: 0 0 10px; }
  ul { margin: 0; padding-left: 18px; } li { margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
  th { text-align: left; color: #59636e; font-weight: 500; padding-bottom: 6px; }
  td { padding: 8px 0; border-top: 1px solid #eef0f2; vertical-align: top; }
  td + td, th + th { padding-left: 12px; }
  .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  th.num { text-align: right; }
  .item { font-weight: 500; }
  tr.sub td { border-top: 0; padding: 3px 0; color: #59636e; }
  tr.sub td.num { color: #1f2328; }
  tr.total td { border-top: 2px solid #1f2328; padding-top: 10px; font-weight: 600; font-size: 15px; }
  .stamp { margin-top: 8px; padding: 10px 12px; border: 1px solid #b7e3c7; background: #ecf8f0; color: #14532d; border-radius: 8px; font-size: 13px; }
  footer { margin-top: 24px; font-size: 11px; color: #8b949e; text-align: center; }
</style></head>
<body>
  <header>
    <div class="brand"><div class="logo">${esc(initial)}</div><div><div class="bname">${esc(d.businessName)}</div>${
      website ? `<div class="muted" style="font-size:13px">${esc(website)}</div>` : ''
    }</div></div>
    <div class="meta muted"><b>Proposal ${esc(d.number)}</b><br>${esc(day(d.issuedAt))}</div>
  </header>

  <section class="first">
    ${d.clientName ? `<div class="muted" style="font-size:13px">For ${esc(d.clientName)}</div>` : ''}
    <h1>${esc(d.title || 'Proposal')}</h1>
    ${d.intro ? `<div>${text(d.intro)}</div>` : ''}
  </section>

  ${d.scope.length ? `<section><h2>What's included</h2><ul>${d.scope.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></section>` : ''}

  <section>
    <h2>Price</h2>
    ${
      d.items.length
        ? `<table><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
           <tbody>${rows}</tbody>
           <tfoot>${subtotalRows}<tr class="total"><td colspan="2">Total</td><td class="num">${esc(money(t.total, c))}</td></tr></tfoot></table>`
        : '<div class="muted">No items.</div>'
    }
    ${d.validUntil ? `<div class="muted" style="margin-top:10px;font-size:13px">Valid till ${esc(day(d.validUntil))}</div>` : ''}
    ${d.acceptedBy ? `<div class="stamp">Accepted by ${esc(d.acceptedBy)}${d.acceptedAt ? ` on ${esc(day(d.acceptedAt))}` : ''}</div>` : ''}
  </section>

  ${d.terms ? `<section><h2>Terms</h2><div style="font-size:13.5px">${text(d.terms)}</div></section>` : ''}

  <footer>Sent with Wazelo</footer>
</body></html>`;
}
