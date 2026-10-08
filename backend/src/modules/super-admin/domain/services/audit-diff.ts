export interface AuditDiff {
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

function same(a: unknown, b: unknown): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The fields of `after` that differ from `before`, as { before, after } —
 * only keys present in `after` are compared, so a partial update stays small.
 */
export function diffChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): AuditDiff {
  const diff: AuditDiff = { before: {}, after: {} };
  for (const key of Object.keys(after)) {
    if (after[key] === undefined) continue;
    if (!same(before[key], after[key])) {
      diff.before[key] = before[key] ?? null;
      diff.after[key] = after[key];
    }
  }
  return diff;
}
