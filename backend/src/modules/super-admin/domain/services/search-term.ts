/** A free-text list search: trimmed, capped at 100 chars; empty means no search. Pure logic. */
export function searchTerm(raw?: string | null): string | undefined {
  const term = (raw ?? '').trim().slice(0, 100);
  return term.length ? term : undefined;
}
