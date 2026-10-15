import { listOrderBy, resolveSort } from './list-sort';

describe('resolveSort', () => {
  it('accepts a whitelisted field and direction', () => {
    expect(resolveSort('organizations', 'name', 'asc')).toEqual({ field: 'name', order: 'asc' });
    expect(resolveSort('tickets', 'priority', 'DESC')).toEqual({ field: 'priority', order: 'desc' });
  });

  it('falls back to the default ordering for an unknown or missing field', () => {
    expect(resolveSort('organizations', 'slug', 'asc')).toEqual({ field: 'createdAt', order: 'desc' });
    expect(resolveSort('payments', undefined, 'asc')).toEqual({ field: 'createdAt', order: 'desc' });
    expect(resolveSort('auditLogs', 'actorEmail')).toEqual({ field: 'createdAt', order: 'desc' });
  });

  it('never accepts inherited object keys as fields', () => {
    expect(resolveSort('invoices', 'constructor', 'asc')).toEqual({ field: 'createdAt', order: 'desc' });
    expect(resolveSort('invoices', '__proto__', 'asc')).toEqual({ field: 'createdAt', order: 'desc' });
  });

  it('uses the default direction when the direction is unknown', () => {
    expect(resolveSort('subscriptions', 'priceInCents', 'sideways')).toEqual({ field: 'priceInCents', order: 'desc' });
    expect(resolveSort('subscriptions', 'status')).toEqual({ field: 'status', order: 'desc' });
  });

  it('keeps each list to its own whitelist', () => {
    expect(resolveSort('invoices', 'paidAt', 'asc').field).toBe('createdAt');
    expect(resolveSort('payments', 'paidAt', 'asc').field).toBe('paidAt');
  });
});

describe('listOrderBy', () => {
  it('adds id as a stable tiebreaker in the same direction', () => {
    expect(listOrderBy('organizations', 'name', 'asc')).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    expect(listOrderBy('tickets')).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });

  it('sorts nulls last on nullable columns', () => {
    expect(listOrderBy('payments', 'paidAt', 'desc')).toEqual([
      { paidAt: { sort: 'desc', nulls: 'last' } },
      { id: 'desc' },
    ]);
  });
});
