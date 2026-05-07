import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageTrackingService } from '../../domain/services/usage-tracking.service';
import { UsageMetricType } from '@prisma/client';

/**
 * Decorator key to attach usage limit metadata to a route.
 * Usage: @UsageLimit(UsageMetricType.MESSAGES_SENT)
 */
export const USAGE_LIMIT_KEY = 'usage_limit';

/**
 * Guard that checks if the requesting org has exceeded their plan's usage limits.
 * Applied to specific routes that consume limited resources.
 *
 * Usage in controller:
 *   @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.MESSAGES_SENT)
 *   @UseGuards(UsageLimitGuard)
 */
@Injectable()
export class UsageLimitGuard implements CanActivate {
  private readonly logger = new Logger(UsageLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly usageTrackingService: UsageTrackingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metricType = this.reflector.get<UsageMetricType>(
      USAGE_LIMIT_KEY,
      context.getHandler(),
    );

    // If no usage limit metadata set, allow through
    if (!metricType) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = user?.orgId ?? request.apiKeyAuth?.orgId;

    if (!orgId) return true;

    const result = await this.usageTrackingService.checkUsage(orgId, metricType);

    if (!result.allowed) {
      this.logger.warn(
        `Usage limit exceeded for org ${orgId}: ${metricType} ` +
        `(${result.currentValue}/${result.limitValue})`,
      );

      throw new ForbiddenException({
        statusCode: 403,
        error: 'USAGE_LIMIT_EXCEEDED',
        message: `You have reached the ${metricType} limit for your current plan. Please upgrade to continue.`,
        details: {
          metricType,
          currentValue: result.currentValue,
          limitValue: result.limitValue,
          percentUsed: result.percentUsed,
        },
      });
    }

    // Attach usage info to request for downstream use
    request._usageCheck = result;

    return true;
  }
}
