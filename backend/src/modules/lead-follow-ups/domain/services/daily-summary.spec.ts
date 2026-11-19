import { buildDailySummary, formatDailySummary, localDay } from './daily-summary';

const t = (iso: string) => new Date(iso);

describe('buildDailySummary', () => {
  const leads = [
    { contactName: 'Lakshmi', contactPhone: '+91 1', productName: 'Villa plots', assigneeName: 'Ravi', dueAt: t('2026-11-10T10:30:00Z'), touchedAt: t('2026-11-10T10:10:00Z') },
    { contactName: 'Kumar', contactPhone: '+91 2', productName: 'Villa plots', assigneeName: 'Priya', dueAt: t('2026-11-10T11:00:00Z'), touchedAt: t('2026-11-10T12:00:00Z') },
    { contactName: null, contactPhone: '+91 3', productName: 'Apartments', assigneeName: 'Ravi', dueAt: t('2026-11-10T12:00:00Z'), touchedAt: null },
  ];

  it('counts leads, contacted, on time and per product', () => {
    const s = buildDailySummary(leads);
    expect(s).toEqual(expect.objectContaining({ total: 3, contacted: 2, onTime: 1 }));
    expect(s.byProduct).toEqual([{ name: 'Villa plots', count: 2 }, { name: 'Apartments', count: 1 }]);
    expect(s.notContacted).toEqual([{ who: '+91 3', product: 'Apartments', assignee: 'Ravi' }]);
  });

  it('reads as one short notification', () => {
    const { title, body } = formatDailySummary('Kavya Homes', buildDailySummary(leads));
    expect(title).toBe('Kavya Homes: 3 leads today');
    expect(body).toBe('Villa plots 2, Apartments 1. Contacted 2 (1 on time). Not contacted 1: +91 3 (Ravi).');
  });
});

describe('localDay', () => {
  it('uses the org time zone for the date, hour and start of day', () => {
    // 14:00 UTC = 19:30 in India
    const d = localDay(t('2026-11-10T14:00:00Z'), 'Asia/Kolkata');
    expect(d.date).toBe('2026-11-10');
    expect(d.hour).toBe(19);
    expect(d.startOfDay.toISOString()).toBe('2026-11-09T18:30:00.000Z');
  });

  it('falls back to UTC for an unknown zone', () => {
    expect(localDay(t('2026-11-10T14:00:00Z'), 'Not/AZone').hour).toBe(14);
  });
});
