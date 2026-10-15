/**
 * Render a button/list payload as "body + numbered options" text. Buttons and
 * lists aren't rendered for linked-device (Baileys) senders.
 */
export function interactiveToText(payload: Record<string, unknown>): string {
  const options: string[] =
    payload.type === 'button'
      ? ((payload.buttons as Array<{ title: string }>) ?? []).map((b) => b.title)
      : ((payload.sections as Array<{ title?: string; rows?: Array<{ title: string; description?: string }> }>) ?? [])
          .flatMap((section) => section.rows ?? [])
          .map((row) => (row.description ? `${row.title} — ${row.description}` : row.title));

  const lines = [
    payload.header as string | undefined,
    payload.body as string | undefined,
    options.length ? options.map((option, i) => `${i + 1}. ${option}`).join('\n') : undefined,
    options.length ? 'Reply with the number of your choice.' : undefined,
    payload.footer as string | undefined,
  ];
  return lines.filter((line): line is string => Boolean(line && line.trim())).join('\n\n');
}
