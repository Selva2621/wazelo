import { Injectable } from '@nestjs/common';
import { BILLING_CONFIG } from '@/common/constants';

export interface ProrationResult {
  creditAmountInCents: number;
  chargeAmountInCents: number;
  netAmountInCents: number; // positive = charge, negative = credit
  daysRemainingInPeriod: number;
  totalDaysInPeriod: number;
}

@Injectable()
export class ProrationService {
  /**
   * Calculate prorated amounts for a mid-cycle plan change.
   *
   * @param currentPriceInCents - Current plan price for full cycle
   * @param newPriceInCents - New plan price for full cycle
   * @param currentPeriodStart - Start of current billing period
   * @param currentPeriodEnd - End of current billing period
   * @param changeDate - When the change takes effect (usually now)
   */
  calculate(
    currentPriceInCents: number,
    newPriceInCents: number,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    changeDate: Date = new Date(),
  ): ProrationResult {
    const totalDaysInPeriod = this.daysBetween(currentPeriodStart, currentPeriodEnd);
    const daysUsed = this.daysBetween(currentPeriodStart, changeDate);
    const daysRemainingInPeriod = Math.max(0, totalDaysInPeriod - daysUsed);

    if (totalDaysInPeriod <= 0) {
      return {
        creditAmountInCents: 0,
        chargeAmountInCents: 0,
        netAmountInCents: 0,
        daysRemainingInPeriod: 0,
        totalDaysInPeriod: 0,
      };
    }

    // Credit for unused portion of current plan
    const dailyRateCurrent = currentPriceInCents / totalDaysInPeriod;
    const creditAmountInCents = BILLING_CONFIG.PRORATION_ROUND_UP
      ? Math.ceil(dailyRateCurrent * daysRemainingInPeriod)
      : Math.floor(dailyRateCurrent * daysRemainingInPeriod);

    // Charge for remaining portion at new plan rate
    const dailyRateNew = newPriceInCents / totalDaysInPeriod;
    const chargeAmountInCents = BILLING_CONFIG.PRORATION_ROUND_UP
      ? Math.ceil(dailyRateNew * daysRemainingInPeriod)
      : Math.floor(dailyRateNew * daysRemainingInPeriod);

    return {
      creditAmountInCents,
      chargeAmountInCents,
      netAmountInCents: chargeAmountInCents - creditAmountInCents,
      daysRemainingInPeriod,
      totalDaysInPeriod,
    };
  }

  private daysBetween(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / msPerDay));
  }
}
