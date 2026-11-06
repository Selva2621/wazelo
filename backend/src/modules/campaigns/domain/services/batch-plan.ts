/**
 * Pure batch planning rules for WhatsApp campaigns.
 *
 * - Recipients are split into fixed-size batches (1..N).
 * - Batches are dealt round-robin across the selected WhatsApp numbers
 *   (1000 recipients, batch size 100, 3 numbers → 4 / 3 / 3 batches).
 * - Each number sends its own batches one after another; different numbers
 *   send at the same time.
 */

export interface BatchAssignment {
  batchNumber: number;
  sessionId: string;
}

export function batchCountFor(total: number, batchSize: number): number {
  if (total <= 0 || batchSize <= 0) return 0;
  return Math.ceil(total / batchSize);
}

/**
 * Session for every batch. Explicit overrides win when their session is still
 * usable; every other batch is dealt round-robin over the pool.
 */
export function planBatchSessions(
  batchCount: number,
  pool: string[],
  overrides: BatchAssignment[] = [],
): Map<number, string> {
  const plan = new Map<number, string>();
  const sessions = [...new Set(pool)];
  if (batchCount <= 0 || sessions.length === 0) return plan;

  const usable = new Set(sessions);
  const overrideByBatch = new Map(
    overrides
      .filter((o) => usable.has(o.sessionId))
      .map((o) => [o.batchNumber, o.sessionId] as const),
  );

  for (let batchNumber = 1; batchNumber <= batchCount; batchNumber++) {
    plan.set(
      batchNumber,
      overrideByBatch.get(batchNumber) ?? sessions[(batchNumber - 1) % sessions.length],
    );
  }
  return plan;
}

/** Reads the session pool + overrides stored on campaign.metadata (tolerates old shapes). */
export function readBatchPlanMetadata(metadata: unknown, fallbackSessionId: string | null): {
  pool: string[];
  overrides: BatchAssignment[];
} {
  const meta = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};

  const overrides: BatchAssignment[] = Array.isArray(meta.batchSessionAssignments)
    ? meta.batchSessionAssignments.flatMap((a) =>
        a && typeof a === 'object' &&
        typeof (a as BatchAssignment).batchNumber === 'number' &&
        typeof (a as BatchAssignment).sessionId === 'string'
          ? [{ batchNumber: (a as BatchAssignment).batchNumber, sessionId: (a as BatchAssignment).sessionId }]
          : [],
      )
    : [];

  const storedPool = Array.isArray(meta.sessionPool)
    ? meta.sessionPool.filter((id): id is string => typeof id === 'string')
    : [];

  // Older campaigns stored only per-batch assignments: their sessions are the pool.
  const pool = [...new Set([
    ...storedPool,
    ...(storedPool.length === 0 ? overrides.map((o) => o.sessionId) : []),
    ...(storedPool.length === 0 && overrides.length === 0 && fallbackSessionId ? [fallbackSessionId] : []),
  ])];

  return { pool, overrides };
}

export interface BatchWorkSummary {
  batchNumber: number;
  /** Session of the batch's unfinished recipients (null for email) */
  sessionId: string | null;
  pending: number;
  queued: number;
}

/**
 * Which batches should be started now.
 *
 * Per sending number, only its lowest unfinished batch is active. It is started
 * when it has PENDING recipients and nothing in flight (QUEUED); a batch with a
 * message in flight continues by itself when that message settles.
 * Email batches (no number) all run in parallel.
 */
export function selectBatchesToDispatch(
  summaries: BatchWorkSummary[],
  options: { sequentialPerSession: boolean },
): number[] {
  const unfinished = summaries
    .filter((s) => s.pending + s.queued > 0)
    .sort((a, b) => a.batchNumber - b.batchNumber);

  if (!options.sequentialPerSession) {
    return unfinished.filter((s) => s.pending > 0 && s.queued === 0).map((s) => s.batchNumber);
  }

  const activeBySession = new Map<string, BatchWorkSummary>();
  for (const summary of unfinished) {
    const key = summary.sessionId ?? '';
    if (!activeBySession.has(key)) activeBySession.set(key, summary);
  }

  return [...activeBySession.values()]
    .filter((s) => s.pending > 0 && s.queued === 0)
    .map((s) => s.batchNumber)
    .sort((a, b) => a - b);
}
