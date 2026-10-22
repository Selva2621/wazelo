import { buildContent, parseFaqs } from './kb-faqs.use-cases';

describe('parseFaqs', () => {
  it('reads a JSON array wrapped in prose or code fences', () => {
    const text = 'Here you go:\n```json\n[{"question":"Do you deliver?","answer":"Yes, across Chennai."}]\n```';
    expect(parseFaqs(text)).toEqual([{ question: 'Do you deliver?', answer: 'Yes, across Chennai.' }]);
  });

  it('drops malformed, empty and over-long items', () => {
    const text = JSON.stringify([
      { question: 'Hi?', answer: 'too short question' },
      { question: 'What are your timings?', answer: '' },
      { question: 'Is parking available?', answer: 'x'.repeat(1001) },
      { q: 'wrong keys' },
      'not an object',
      { question: 'What are your timings?', answer: '9am to 8pm.' },
    ]);
    expect(parseFaqs(text)).toEqual([{ question: 'What are your timings?', answer: '9am to 8pm.' }]);
  });

  it('skips questions already published and repeats, ignoring case and punctuation', () => {
    const text = JSON.stringify([
      { question: 'Do you deliver?', answer: 'Yes.' },
      { question: 'What is the price', answer: '₹999 a month.' },
      { question: 'What is the price?!', answer: 'Same.' },
    ]);
    expect(parseFaqs(text, ['do you DELIVER'])).toEqual([{ question: 'What is the price', answer: '₹999 a month.' }]);
  });

  it('keeps non-Latin questions', () => {
    const text = JSON.stringify([{ question: 'டெலிவரி உண்டா?', answer: 'ஆம், சென்னை முழுவதும்.' }]);
    expect(parseFaqs(text)).toHaveLength(1);
  });

  it('returns nothing for invalid JSON', () => {
    expect(parseFaqs('[{"question": broken')).toEqual([]);
    expect(parseFaqs('no json here')).toEqual([]);
  });

  it('caps at 10 suggestions', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ question: `Question number ${i}?`, answer: 'Yes.' }));
    expect(parseFaqs(JSON.stringify(many))).toHaveLength(10);
  });
});

describe('buildContent', () => {
  it('shares the budget so a long first page cannot crowd out the rest', () => {
    const out = buildContent(
      [
        { title: 'Home', extractedText: 'x'.repeat(5000) },
        { title: 'Pricing', extractedText: 'y'.repeat(50) },
        { title: 'Contact', extractedText: 'z'.repeat(5000) },
      ],
      300,
    );
    expect(out).toContain('## Pricing\n' + 'y'.repeat(50));
    expect(out.match(/x/g)!.length).toBe(100);
    expect(out.match(/z/g)!.length).toBe(150); // gets what Pricing left over
  });

  it('is empty when no document has text', () => {
    expect(buildContent([{ title: 'Empty', extractedText: null }, { title: 'Blank', extractedText: '   ' }])).toBe('');
  });
});
