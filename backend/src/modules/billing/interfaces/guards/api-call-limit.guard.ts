import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { UsageMetricType } from '@prisma/client';
import { UsageTrackingService } from '../../domain/services/usage-tracking.service';

/**
 * Counts each Developer API request against the plan's monthly API call limit
 * and blocks it once the limit is reached. Runs after the API key guard.
 * One locked statement takes the call, so parallel requests can't overshoot.
 */
@Injectable()
export class ApiCallLimitGuard implements CanActivate {
  constructor(private readonly usageTracking: UsageTrackingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const orgId: string | undefined = request.apiKeyAuth?.orgId ?? request.user?.orgId;
    if (!orgId) return true;

    const taken = await this.usageTracking.consumeUpTo(orgId, UsageMetricType.API_CALLS, 1);
    if (taken === 1) return true;

    const usage = await this.usageTracking.checkUsage(orgId, UsageMetricType.API_CALLS);
    throw new ForbiddenException({
      statusCode: 403,
      error: 'USAGE_LIMIT_EXCEEDED',
      message: 'You have reached the monthly API call limit for your current plan. Please upgrade to continue.',
      details: {
        metricType: UsageMetricType.API_CALLS,
        currentValue: usage.currentValue,
        limitValue: usage.limitValue,
      },
    });
  }
}
