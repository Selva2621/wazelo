import { findUnknownPlaceholders } from './message-placeholders';

describe('findUnknownPlaceholders', () => {
  it('accepts the contact fields the worker fills', () => {
    expect(findUnknownPlaceholders('Hi {{name}}, {{contact.phone}} / {{ email }}')).toEqual([]);
  });

  it('lists template placeholders nobody fills, once each', () => {
    expect(
      findUnknownPlaceholders('Hi {{name}}, about {{lead.service}} — {{lead.service}} by {{lead.deadline}}'),
    ).toEqual(['lead.service', 'lead.deadline']);
  });

  it('handles empty bodies', () => {
    expect(findUnknownPlaceholders(null)).toEqual([]);
    expect(findUnknownPlaceholders('')).toEqual([]);
  });
});
