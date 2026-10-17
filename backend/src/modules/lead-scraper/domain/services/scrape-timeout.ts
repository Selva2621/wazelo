/** Longest any run may take; also the age after which a RUNNING run counts as stuck. */
export const MAX_RUN_MS = 30 * 60_000;

const BASE_MS = 3 * 60_000; // browser start, searches and list scrolling
const PER_PLACE_MS = 6_000; // one Google Maps detail page
const PER_REVIEW_MS = 5_000; // extra for the newest-review lookup
const EMAIL_LOOKUP_MS = 2 * 60_000;

export interface RunWorkload {
  maxResults: number;
  isMaps: boolean;
  /** Filters drop leads, so Maps visits up to 3× the places */
  filtered: boolean;
  collectLastReview: boolean;
  findEmails: boolean;
}

/** Time limit for one run, scaled to the work it asked for. */
export function scrapeRunTimeoutMs(w: RunWorkload): number {
  let ms = BASE_MS + (w.findEmails ? EMAIL_LOOKUP_MS : 0);
  if (w.isMaps) {
    const places = w.filtered ? Math.min(w.maxResults * 3, w.maxResults + 100) : w.maxResults;
    ms += places * (PER_PLACE_MS + (w.collectLastReview ? PER_REVIEW_MS : 0));
  }
  return Math.min(ms, MAX_RUN_MS);
}

export class ScrapeTimeoutError extends Error {
  constructor(ms: number) {
    super(`Stopped after ${Math.round(ms / 60_000)} min without finishing — try a lower max results or fewer filters`);
  }
}
