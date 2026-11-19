// Customer asking for a person, in English, Tanglish or Tamil. Kept narrow on purpose:
// a missed request still reaches a person after two unanswered questions.
const PATTERNS: RegExp[] = [
  /\b(talk|speak|chat|connect)\s+(to|with|me\s+(to|with))\s+(a\s+|the\s+|your\s+|some\s*)?(human|person|someone|somebody|agent|staff|team|owner|manager|executive|representative)\b/i,
  /\b(real|live)\s+(person|human|agent)\b/i,
  /\b(human\s+agent|customer\s+care|call\s+me|call\s+back|callback)\b/i,
  /\b(aal|aalu|yaaravathu|yarachum|owner|manager)\s*(kitta|kooda)?\s*(pesa|pesanum|pesalama|pesa\s*mudiyuma)\b/i,
  /\b(call\s+pannunga|call\s+pannuga|call\s+panna\s+mudiyuma)\b/i,
  /(மனிதர்|ஆள்|ஓனர்|மேனேஜர்).{0,15}பேச/,
];

export function wantsHuman(text: string): boolean {
  const t = (text ?? '').trim();
  if (!t || t.length > 300) return false;
  return PATTERNS.some((p) => p.test(t));
}
