import { cleanImproved } from './improve-proposal.use-case';

describe('cleanImproved', () => {
  it('strips quotes, code fences and "Here is…" lead-ins', () => {
    expect(cleanImproved('"Hi Priya, thanks for reaching out."', 'intro')).toBe('Hi Priya, thanks for reaching out.');
    expect(cleanImproved('```\nHi Priya.\n```', 'intro')).toBe('Hi Priya.');
    expect(cleanImproved("Here's the improved intro:\nHi Priya.", 'intro')).toBe('Hi Priya.');
  });

  it('turns scope into plain lines without bullets or numbers', () => {
    expect(cleanImproved('- 5-page website\n* Mobile friendly\n• SEO basics\n1. Hosting setup\n\n2) Training', 'scope')).toBe(
      '5-page website\nMobile friendly\nSEO basics\nHosting setup\nTraining',
    );
  });

  it('keeps at most 10 scope lines', () => {
    const many = Array.from({ length: 14 }, (_, i) => `- point ${i}`).join('\n');
    expect(cleanImproved(many, 'scope').split('\n')).toHaveLength(10);
  });

  it('is empty for an empty reply', () => {
    expect(cleanImproved('', 'terms')).toBe('');
  });
});
