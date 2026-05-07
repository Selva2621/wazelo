import { Injectable, Logger } from '@nestjs/common';
import { LeadScoringRepository } from '../../infrastructure/repositories/lead-scoring.repository';

/**
 * Core lead scoring logic.
 * Evaluates scoring rules against signals and updates contact scores.
 */
@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  constructor(private readonly repo: LeadScoringRepository) {}

  /**
   * Process a scoring signal for a contact.
   * Finds all matching enabled rules for the signal, checks conditions,
   * respects maxPerContact limits, and applies score delta.
   */
  async processSignal(params: {
    contactId: string;
    orgId: string;
    currentScore: number;
    signal: string;
    context: Record<string, unknown>; // e.g. { source, toStatus, fromStatus, tagName, ... }
  }): Promise<{ newScore: number; applied: number }> {
    const { contactId, orgId, currentScore, signal, context } = params;

    const rules = await this.repo.findEnabledRulesBySignal(orgId, signal);
    if (rules.length === 0) return { newScore: currentScore, applied: 0 };

    let score = currentScore;
    let applied = 0;

    for (const rule of rules) {
      // Check condition match
      if (rule.condition && !this.matchCondition(rule.condition as Record<string, unknown>, context)) {
        continue;
      }

      // Check maxPerContact limit
      if (rule.maxPerContact > 0) {
        const count = await this.repo.countRuleApplications(contactId, rule.id);
        if (count >= rule.maxPerContact) {
          this.logger.debug(
            `Rule ${rule.id} (${rule.name}) maxPerContact reached for contact ${contactId}`,
          );
          continue;
        }
      }

      const previousScore = score;
      score = Math.max(0, Math.min(100, score + rule.points));
      const delta = score - previousScore;

      if (delta === 0) continue; // score clamped, no change

      await this.repo.createScoreEntry({
        contactId,
        orgId,
        previousScore,
        newScore: score,
        delta,
        reason: `${rule.name} (${signal})`,
        ruleId: rule.id,
      });

      applied++;
      this.logger.debug(
        `Applied rule "${rule.name}" to contact ${contactId}: ${previousScore} → ${score} (${delta > 0 ? '+' : ''}${delta})`,
      );
    }

    if (applied > 0) {
      await this.repo.updateContactScore(contactId, orgId, score);
    }

    return { newScore: score, applied };
  }

  /**
   * Simple condition matcher: all keys in condition must match context values.
   * Supports equality matching and array "includes" for context arrays.
   */
  private matchCondition(
    condition: Record<string, unknown>,
    context: Record<string, unknown>,
  ): boolean {
    for (const [key, expected] of Object.entries(condition)) {
      const actual = context[key];
      if (actual === undefined) return false;
      if (Array.isArray(actual)) {
        if (!actual.includes(expected)) return false;
      } else if (actual !== expected) {
        return false;
      }
    }
    return true;
  }

  /**
   * Manually set a contact's score (admin override).
   */
  async setScore(params: {
    contactId: string;
    orgId: string;
    currentScore: number;
    newScore: number;
    reason: string;
  }): Promise<void> {
    const { contactId, orgId, currentScore, newScore, reason } = params;
    const clamped = Math.max(0, Math.min(100, newScore));

    await this.repo.createScoreEntry({
      contactId,
      orgId,
      previousScore: currentScore,
      newScore: clamped,
      delta: clamped - currentScore,
      reason,
    });

    await this.repo.updateContactScore(contactId, orgId, clamped);
  }
}
