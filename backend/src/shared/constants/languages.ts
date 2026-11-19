/**
 * Languages a template can be written in (manually or with Write with AI).
 * Codes follow WhatsApp/Meta template language codes. Keep in step with
 * frontend/src/components/templates/template-editor-modal.tsx TEMPLATE_LANGUAGES.
 */
export const TEMPLATE_LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
  pa: 'Punjabi',
  ur: 'Urdu',
  ar: 'Arabic',
  es: 'Spanish',
  fr: 'French',
  id: 'Indonesian',
};

export const TEMPLATE_LANGUAGE_CODES = Object.keys(TEMPLATE_LANGUAGE_NAMES);

/** "Tamil" for "ta"; English for anything unknown */
export function templateLanguageName(code?: string | null): string {
  return TEMPLATE_LANGUAGE_NAMES[code ?? 'en'] ?? 'English';
}

/** Indian languages, where AI otherwise drifts into formal, bookish wording nobody texts in */
const SPOKEN_STYLE_LANGUAGES = new Set(['ta', 'hi', 'te', 'kn', 'ml', 'mr', 'bn', 'gu', 'pa', 'ur']);

/** Per-language hints: spoken forms people actually type, vs the literary ones to avoid */
const SPOKEN_HINTS: Record<string, string> = {
  ta: 'Use spoken Tamil forms like "உங்க", "இருக்கு", "பண்ணுங்க", "வாங்க", "ரெடி" instead of literary ones like "உங்களுடைய", "உள்ளது", "செய்யவும்", "வருக", "தயார்".',
  hi: 'Use everyday Hindi as people talk ("aapka order ready hai" style wording in Devanagari), not shuddh/Sanskritised Hindi.',
};

/**
 * How to write in the chosen language. For Indian languages: everyday spoken style the way
 * people text on WhatsApp, in that language's script, with the common English words people
 * actually use (offer, order, booking, call, payment, link…) left in English.
 * Fields like {{name}} always stay exactly as written.
 */
export function languageStyleRule(code?: string | null): string {
  const name = templateLanguageName(code);
  if (name === 'English') return 'Write in English.';
  const keepFields = 'Keep fields like {{name}} exactly as written (in English).';
  if (!SPOKEN_STYLE_LANGUAGES.has(code ?? '')) return `Write in ${name}. ${keepFields}`;
  return [
    `Write in ${name}, in ${name} script, the way people actually text each other on WhatsApp:`,
    `everyday spoken ${name}, short simple sentences, warm and friendly.`,
    'Never use formal, literary, old-fashioned or bookish words.',
    'Say only what the request asks for, in 2 to 4 short sentences. No extra lines, no poetic phrases, no made-up details or filler.',
    'Keep common English words people normally say in English (offer, discount, order, booking, call, payment, link, delivery, appointment) instead of translating them into pure forms.',
    SPOKEN_HINTS[code ?? ''] ?? '',
    keepFields,
  ]
    .filter(Boolean)
    .join(' ');
}
