/** Which feature a message came from, read from what each sender stores in its metadata. */
export function sentBy(metadata: unknown): string {
  const m = (metadata ?? {}) as Record<string, unknown>;
  if (m.campaignId) return `campaign ${String(m.campaignId)}`;
  if (m.sequenceId) return `sequence ${String(m.sequenceId)}`;
  if (m.automationRuleId) return `automation rule ${String(m.automationRuleId)}`;
  if (m.scheduledMessageId) return `scheduled message ${String(m.scheduledMessageId)}`;
  if (typeof m.source === 'string') return m.source; // e.g. "chatbot"
  return 'a person (inbox/app)';
}

/** "+919876543210" → "+91******3210": enough to tell contacts apart, not a full number in logs. */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '***';
  return `${phone.slice(0, 3)}${'*'.repeat(Math.max(0, phone.length - 7))}${phone.slice(-4)}`;
}
