import { cardToLead, citySlug, IndiaMartCard, slugVariants } from './indiamart.scraper';

const card = (over: Partial<IndiaMartCard> = {}): IndiaMartCard => ({
  seller: 'Milestone Systems',
  sellerUrl: 'https://www.milestonesystems.co.in/',
  city: 'Chennai',
  meta: '·  16 yrs',
  trustSeal: true,
  responseRate: '78% Response Rate',
  rating: '4.4',
  reviews: '(86)',
  product: '20W Wipro Light Storm',
  productUrl: 'https://www.indiamart.com/proddetail/wipro-light-storm-10706146233.html',
  price: '₹ 4,200 /  Piece(s)',
  ...over,
});

describe('cardToLead', () => {
  it('keeps the supplier website and IndiaMART trust details', () => {
    expect(cardToLead(card(), 'LED lights')).toMatchObject({
      name: 'Milestone Systems',
      website: 'https://www.milestonesystems.co.in/',
      location: 'Chennai',
      category: 'LED lights',
      rating: 4.4,
      reviewCount: 86,
      yearsListed: 16,
      trustSeal: true,
      responseRate: 78,
      budget: '₹ 4,200 / Piece(s)',
      sourceUrl: 'https://www.indiamart.com/proddetail/wipro-light-storm-10706146233.html',
    });
  });

  it('treats an IndiaMART mini-site as the source, not a website', () => {
    const lead = cardToLead(card({ sellerUrl: 'https://www.indiamart.com/jnlites/' }), 'LED lights');
    expect(lead?.website).toBeUndefined();
    expect(lead?.sourceUrl).toBe('https://www.indiamart.com/jnlites/');
  });

  it('skips cards without a seller', () => {
    expect(cardToLead(card({ seller: '  ' }), 'x')).toBeNull();
  });
});

describe('slugVariants', () => {
  it('tries the plural and singular form', () => {
    expect(slugVariants('Gym Equipment')).toEqual(['gym-equipment', 'gym-equipments']);
    expect(slugVariants('LED Lights')).toEqual(['led-lights', 'led-light']);
    expect(slugVariants('Nuts & Bolts')).toEqual(['nuts-and-bolts', 'nuts-and-bolt']);
  });
});

describe('citySlug', () => {
  it('uses the first part of the location; India means all India', () => {
    expect(citySlug('Mumbai, India')).toBe('mumbai');
    expect(citySlug('New Delhi')).toBe('new-delhi');
    expect(citySlug('India')).toBeUndefined();
    expect(citySlug(undefined)).toBeUndefined();
  });
});
