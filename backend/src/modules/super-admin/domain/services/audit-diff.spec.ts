import { diffChanges } from './audit-diff';

describe('diffChanges', () => {
  it('keeps only changed fields', () => {
    expect(
      diffChanges({ name: 'Starter', priceInCents: 1000, maxUsers: 5 }, { name: 'Starter', priceInCents: 1500 }),
    ).toEqual({ before: { priceInCents: 1000 }, after: { priceInCents: 1500 } });
  });

  it('ignores undefined values in the update', () => {
    expect(diffChanges({ name: 'A' }, { name: undefined })).toEqual({ before: {}, after: {} });
  });

  it('records a missing previous value as null', () => {
    expect(diffChanges({}, { description: 'New' })).toEqual({
      before: { description: null },
      after: { description: 'New' },
    });
  });

  it('compares dates by value', () => {
    const d = new Date('2026-01-01T00:00:00Z');
    expect(diffChanges({ at: d }, { at: new Date(d) })).toEqual({ before: {}, after: {} });
  });
});
