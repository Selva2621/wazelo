import { parseDraft } from './draft-proposal.use-case';
import { formatMoney, proposalMessage } from './send-proposal.use-case';

describe('parseDraft', () => {
  it('reads the JSON inside prose and cleans it', () => {
    const text = `Sure!\n\`\`\`json\n${JSON.stringify({
      title: 'Bakery website',
      intro: 'Hi Priya, here is the plan.',
      scope: ['5 pages', '', 'WhatsApp order button'],
      items: [{ name: 'Website', quantity: 1, unitPrice: '25,000' }, { name: 'Hosting', unitPrice: 'ask' }],
      terms: '50% advance',
      validDays: 500,
    })}\n\`\`\``;
    expect(parseDraft(text)).toEqual({
      title: 'Bakery website',
      intro: 'Hi Priya, here is the plan.',
      scope: ['5 pages', 'WhatsApp order button'],
      items: [
        { name: 'Website', quantity: 1, unitPrice: 25000 },
        { name: 'Hosting', quantity: 1, unitPrice: 0 },
      ],
      terms: '50% advance',
      validDays: 90,
    });
  });

  it('rejects drafts with nothing to bill or describe, and bad JSON', () => {
    expect(parseDraft('{"title": "x", "items": [], "scope": []}')).toBeNull();
    expect(parseDraft('{"title": broken')).toBeNull();
    expect(parseDraft('no json')).toBeNull();
  });
});

describe('proposal WhatsApp message', () => {
  it('formats money per currency', () => {
    expect(formatMoney(35400, 'INR')).toBe('₹35,400');
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatMoney(100000, 'INR')).toBe('₹1,00,000');
  });

  it('greets by first name and carries the total, validity and link', () => {
    const text = proposalMessage({
      clientName: 'Priya Raman',
      title: 'Bakery website',
      total: 35400,
      currency: 'INR',
      hasTax: true,
      validUntil: new Date('2026-11-06T12:00:00Z'),
      url: 'https://app.example/p/abc',
    });
    expect(text).toContain("Hi Priya, here's our proposal for *Bakery website*.");
    expect(text).toContain('Total: *₹35,400* (incl. tax)');
    expect(text).toContain('Valid till 6 Nov 2026');
    expect(text).toContain('https://app.example/p/abc');
  });

  it('works without a name or a date', () => {
    const text = proposalMessage({ clientName: null, title: 'Logo', total: 5000, currency: 'INR', hasTax: false, validUntil: null, url: 'u' });
    expect(text.startsWith("Hi, here's our proposal")).toBe(true);
    expect(text).not.toContain('Valid till');
    expect(text).not.toContain('incl. tax');
  });
});
