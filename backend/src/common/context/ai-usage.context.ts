import { AsyncLocalStorage } from 'async_hooks';

/**
 * Per-request record of whether an AI provider actually answered. The AI credit
 * interceptor opens it around a handler; AiProviderService marks it on a non-empty
 * completion, so a route that fell back to canned output is not charged.
 */
export interface AiUsageStore {
  answered: boolean;
}

export const aiUsageContext = new AsyncLocalStorage<AiUsageStore>();

export function markAiAnswered(): void {
  const store = aiUsageContext.getStore();
  if (store) store.answered = true;
}
