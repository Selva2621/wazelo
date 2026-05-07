import { Injectable, Logger } from '@nestjs/common';
import { SlaPolicy } from '@prisma/client';

export interface DeadlineResult {
  deadlineAt: Date;
  warningAt: Date | null;
}

@Injectable()
export class SlaCalculationService {
  private readonly logger = new Logger(SlaCalculationService.name);

  /**
   * Calculate the deadline and optional warning time for an SLA tracking entry.
   * Supports business-hours-only calculation where non-business time is excluded.
   */
  calculateDeadline(
    policy: SlaPolicy,
    startTime: Date,
  ): DeadlineResult {
    if (policy.businessHoursOnly && policy.businessHoursStart !== null && policy.businessHoursEnd !== null) {
      return this.calculateBusinessHoursDeadline(policy, startTime);
    }

    // Simple calendar-time deadline
    const deadlineAt = new Date(startTime.getTime() + policy.thresholdMs);
    const warningAt = policy.warningThresholdMs
      ? new Date(startTime.getTime() + policy.warningThresholdMs)
      : null;

    return { deadlineAt, warningAt };
  }

  /**
   * Calculate elapsed time in milliseconds, accounting for business hours if applicable.
   */
  calculateElapsedMs(
    policy: SlaPolicy,
    startTime: Date,
    endTime: Date,
    pausedDurationMs: number = 0,
  ): number {
    if (policy.businessHoursOnly && policy.businessHoursStart !== null && policy.businessHoursEnd !== null) {
      return this.calculateBusinessHoursElapsed(policy, startTime, endTime) - pausedDurationMs;
    }

    return endTime.getTime() - startTime.getTime() - pausedDurationMs;
  }

  /**
   * Check if the current time is within business hours for a policy.
   */
  isWithinBusinessHours(policy: SlaPolicy, now: Date): boolean {
    if (!policy.businessHoursOnly) return true;
    if (policy.businessHoursStart === null || policy.businessHoursEnd === null) return true;

    const adjustedNow = this.toTimezone(now, policy.timezone ?? 'UTC');
    const day = adjustedNow.getDay();
    const hour = adjustedNow.getHours();

    // Check business days
    const businessDays = (policy.businessDays as number[] | null) ?? [1, 2, 3, 4, 5];
    if (!businessDays.includes(day)) return false;

    // Check business hours
    if (policy.businessHoursStart < policy.businessHoursEnd) {
      // Normal range: e.g. 9-17
      return hour >= policy.businessHoursStart && hour < policy.businessHoursEnd;
    } else {
      // Overnight range: e.g. 22-6
      return hour >= policy.businessHoursStart || hour < policy.businessHoursEnd;
    }
  }

  /**
   * Calculate deadline with business hours.
   * Walks forward from startTime, adding only business-hour minutes until thresholdMs is reached.
   */
  private calculateBusinessHoursDeadline(
    policy: SlaPolicy,
    startTime: Date,
  ): DeadlineResult {
    const thresholdMs = policy.thresholdMs;
    const warningThresholdMs = policy.warningThresholdMs;

    const deadlineAt = this.addBusinessMs(policy, startTime, thresholdMs);
    const warningAt = warningThresholdMs
      ? this.addBusinessMs(policy, startTime, warningThresholdMs)
      : null;

    return { deadlineAt, warningAt };
  }

  /**
   * Add business-time milliseconds to a start date.
   * Steps forward in 1-minute increments within business hours.
   */
  private addBusinessMs(
    policy: SlaPolicy,
    startTime: Date,
    targetMs: number,
  ): Date {
    const businessStart = policy.businessHoursStart!;
    const businessEnd = policy.businessHoursEnd!;
    const businessDays = (policy.businessDays as number[] | null) ?? [1, 2, 3, 4, 5];
    const tz = policy.timezone ?? 'UTC';

    let remaining = targetMs;
    const cursor = new Date(startTime);

    // Safety: max iterations to prevent infinite loop (60 days worth of minutes)
    const maxIterations = 60 * 24 * 60;
    let iterations = 0;

    while (remaining > 0 && iterations < maxIterations) {
      iterations++;
      const adjusted = this.toTimezone(cursor, tz);
      const day = adjusted.getDay();
      const hour = adjusted.getHours();
      const minute = adjusted.getMinutes();

      const isBusinessDay = businessDays.includes(day);
      let isBusinessHour = false;

      if (isBusinessDay) {
        if (businessStart < businessEnd) {
          isBusinessHour = hour >= businessStart && hour < businessEnd;
        } else {
          isBusinessHour = hour >= businessStart || hour < businessEnd;
        }
      }

      if (isBusinessHour) {
        // Determine how much business time remains in this minute
        const step = Math.min(remaining, 60_000);
        remaining -= step;
        cursor.setTime(cursor.getTime() + step);
      } else {
        // Skip to next business hour start
        this.advanceToNextBusinessTime(cursor, tz, businessStart, businessDays);
      }
    }

    if (iterations >= maxIterations) {
      this.logger.warn(
        `Business hours deadline calculation hit max iterations for policy=${policy.id}`,
      );
    }

    return cursor;
  }

  /**
   * Calculate business hours elapsed between two timestamps.
   */
  private calculateBusinessHoursElapsed(
    policy: SlaPolicy,
    startTime: Date,
    endTime: Date,
  ): number {
    const businessStart = policy.businessHoursStart!;
    const businessEnd = policy.businessHoursEnd!;
    const businessDays = (policy.businessDays as number[] | null) ?? [1, 2, 3, 4, 5];
    const tz = policy.timezone ?? 'UTC';

    let elapsed = 0;
    const cursor = new Date(startTime);

    const maxIterations = 60 * 24 * 60;
    let iterations = 0;

    while (cursor < endTime && iterations < maxIterations) {
      iterations++;
      const adjusted = this.toTimezone(cursor, tz);
      const day = adjusted.getDay();
      const hour = adjusted.getHours();

      const isBusinessDay = businessDays.includes(day);
      let isBusinessHour = false;

      if (isBusinessDay) {
        if (businessStart < businessEnd) {
          isBusinessHour = hour >= businessStart && hour < businessEnd;
        } else {
          isBusinessHour = hour >= businessStart || hour < businessEnd;
        }
      }

      if (isBusinessHour) {
        const step = Math.min(60_000, endTime.getTime() - cursor.getTime());
        elapsed += step;
        cursor.setTime(cursor.getTime() + step);
      } else {
        this.advanceToNextBusinessTime(cursor, tz, businessStart, businessDays);
        // If we jumped past endTime, stop
        if (cursor >= endTime) break;
      }
    }

    return elapsed;
  }

  /**
   * Advance cursor to the start of the next business period.
   */
  private advanceToNextBusinessTime(
    cursor: Date,
    tz: string,
    businessStart: number,
    businessDays: number[],
  ): void {
    // Move to start of next hour first
    cursor.setTime(cursor.getTime() + 3_600_000);
    cursor.setMinutes(0, 0, 0);

    // Then advance day-by-day until we hit a business day at business start
    let safety = 0;
    while (safety < 10) {
      safety++;
      const adjusted = this.toTimezone(cursor, tz);
      const day = adjusted.getDay();
      const hour = adjusted.getHours();

      if (businessDays.includes(day) && hour === businessStart) {
        return;
      }

      // If we're on a business day but before business start, jump to business start
      if (businessDays.includes(day) && hour < businessStart) {
        const diff = (businessStart - hour) * 3_600_000;
        cursor.setTime(cursor.getTime() + diff);
        cursor.setMinutes(0, 0, 0);
        return;
      }

      // Otherwise jump to next day at midnight and try again
      cursor.setTime(cursor.getTime() + 24 * 3_600_000);
      // Reset to midnight in the target timezone approximation
      const nextAdj = this.toTimezone(cursor, tz);
      const hoursToMidnight = nextAdj.getHours();
      if (hoursToMidnight > 0) {
        cursor.setTime(cursor.getTime() - hoursToMidnight * 3_600_000);
      }
    }
  }

  /**
   * Convert a UTC date to a timezone-adjusted Date for hour/day calculations.
   * Uses Intl.DateTimeFormat for accurate timezone support.
   */
  private toTimezone(date: Date, timezone: string): Date {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(date);

      const get = (type: string) =>
        parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

      return new Date(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour'),
        get('minute'),
        get('second'),
      );
    } catch {
      // Fallback to UTC if timezone is invalid
      return date;
    }
  }
}
