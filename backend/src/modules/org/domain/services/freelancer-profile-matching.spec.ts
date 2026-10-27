import { BUILT_IN_CATALOG, FREELANCER_TYPES, buildFreelancerTemplates } from '@/shared/constants/freelancer-profiles';
import { matchService, normalizeService, pitchProblems, profileKey } from './freelancer-profile-matching';

const match = (text: string) => matchService(text, BUILT_IN_CATALOG);

describe('freelancer catalog matching (no AI)', () => {
  it('normalises typed text', () => {
    expect(normalizeService('  Interior-Design!! ')).toBe('interior design');
  });

  it('makes keys that fit the 30-char column', () => {
    expect(profileKey('Home Baker')).toBe('HOME_BAKER');
    expect(profileKey('Wedding & Event Photography Services Pro').length).toBeLessThanOrEqual(30);
  });

  it.each([
    ['design civil engineer', 'ARCHITECT_CIVIL'],
    ['Interior designing', 'INTERIOR_DESIGNER'],
    ['GST and income tax filing', 'ACCOUNTANT'],
    ['maths tuition', 'TUTOR'],
    ['bridal makeup', 'MAKEUP_ARTIST'],
    ['wordpress websites', 'WEB_DEVELOPER'],
    ['logo and branding', 'DESIGNER'],
    ['AC repair and plumbing', 'HOME_SERVICES'],
    ['yoga classes', 'FITNESS_TRAINER'],
  ])('"%s" → %s', (text, key) => {
    expect(match(text)).toBe(key);
  });

  it('returns null when nothing matches or two types tie', () => {
    expect(match('asdf qwerty zzz')).toBeNull();
    expect(match('cake baking')).toBeNull();
    // one keyword each for photography and event planning
    expect(match('drone and decoration')).toBeNull();
  });

  it('every built-in type has a card description, keywords and 4 usable templates', () => {
    const builtIn = FREELANCER_TYPES.filter((t) => t !== 'OTHER');
    expect(BUILT_IN_CATALOG.map((c) => c.key)).toEqual(builtIn);
    for (const c of BUILT_IN_CATALOG) {
      expect(c.description.length).toBeGreaterThan(5);
      expect(c.keywords.length).toBeGreaterThan(3);
      expect(c.key.length).toBeLessThanOrEqual(30);
    }
    expect(BUILT_IN_CATALOG.filter((c) => c.popular)).toHaveLength(8);
    const pitches = buildFreelancerTemplates(builtIn).filter((t) => t.name.startsWith('pitch_'));
    expect(pitches).toHaveLength(builtIn.length * 4);
    for (const t of pitches) expect(pitchProblems({ intro: t.body, portfolio: t.body, followup: t.body, packages: t.body })).toEqual([]);
  });

  it('flags short templates and unknown placeholders from a super admin', () => {
    const ok = 'Hi {{contact.name}}, here is my work: {{lead.portfolio_link}}';
    expect(pitchProblems({ intro: ok, portfolio: ok, followup: ok, packages: ok })).toEqual([]);
    expect(pitchProblems({ intro: 'hi', portfolio: ok, followup: ok, packages: `${ok} {{lead.price}}` })).toEqual([
      'intro: write at least 20 characters',
      'packages: {{lead.price}} is not available (use {{contact.name}}, {{org.name}}, {{lead.portfolio_link}})',
    ]);
  });
});
