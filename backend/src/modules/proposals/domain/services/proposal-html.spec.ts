import { renderProposalHtml } from './proposal-html';
import { pdfFileName } from '../../application/use-cases/proposal-pdf.use-case';
import { documentMimeType } from '@/infrastructure/external/whatsapp/document-mime';

const base = {
  number: 'P-0001',
  title: 'Bakery website',
  intro: 'Hi Priya,\nhere is the plan.',
  scope: ['5 pages', 'WhatsApp order button'],
  items: [
    { name: 'Website', quantity: 1, unitPrice: 25000 },
    { name: 'Logo', quantity: 2, unitPrice: 2500 },
  ],
  taxPercent: 18,
  currency: 'INR',
  totals: { subtotal: 30000, discount: 0, tax: 5400, total: 35400 },
  terms: '50% advance',
  validUntil: new Date('2026-11-06T12:00:00Z'),
  issuedAt: new Date('2026-10-24T12:00:00Z'),
  clientName: 'Priya',
  businessName: 'Selva Studio',
  businessWebsite: 'https://selva.studio/',
};

describe('renderProposalHtml', () => {
  it('shows the content, totals and dates', () => {
    const html = renderProposalHtml(base);
    expect(html).toContain('Proposal P-0001');
    expect(html).toContain('Bakery website');
    expect(html).toContain('Hi Priya,<br>here is the plan.');
    expect(html).toContain('<li>5 pages</li>');
    expect(html).toContain('₹35,400');
    expect(html).toContain('Tax (18%)');
    expect(html).toContain('₹2,500 each'); // quantity 2
    expect(html).toContain('Valid till 6 Nov 2026');
    expect(html).toContain('selva.studio');
    expect(html).not.toContain('Accepted by');
  });

  it('escapes everything the user or client typed', () => {
    const html = renderProposalHtml({
      ...base,
      title: '<script>alert(1)</script>',
      clientName: '"><img src=x onerror=alert(1)>',
      scope: ['<b>bold</b>'],
      items: [{ name: '<i>x</i>', quantity: 1, unitPrice: 10 }],
      terms: "it's <u>fine</u>",
    });
    expect(html).not.toMatch(/<script>|<img |<b>bold|<i>x|<u>fine/);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('it&#39;s &lt;u&gt;fine&lt;/u&gt;');
  });

  it('stamps accepted proposals and hides empty sections', () => {
    const html = renderProposalHtml({ ...base, scope: [], terms: null, acceptedBy: 'Priya', acceptedAt: new Date('2026-10-25T12:00:00Z') });
    expect(html).toContain('Accepted by Priya on 25 Oct 2026');
    expect(html).not.toContain("What's included");
    expect(html).not.toContain('<h2>Terms</h2>');
  });
});

describe('pdfFileName / documentMimeType', () => {
  it('makes a safe file name', () => {
    expect(pdfFileName('P-0001', 'Website / app: phase 1?')).toBe('Proposal P-0001 - Website app phase 1.pdf');
    expect(pdfFileName('P-0002', '')).toBe('Proposal P-0002.pdf');
  });

  it('picks the document type from the name', () => {
    expect(documentMimeType('Proposal P-0001.pdf')).toBe('application/pdf');
    expect(documentMimeType('https://x/files/a.DOCX?x=1')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(documentMimeType('notes')).toBe('application/octet-stream');
  });
});
