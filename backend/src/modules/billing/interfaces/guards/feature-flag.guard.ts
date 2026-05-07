import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageTrackingService } from '../../domain/services/usage-tracking.service';

/**
 * Decorator key to attach feature flag metadata to a route.
 * Usage: @SetMetadata(FEATURE_FLAG_KEY, 'campaigns')
 */
export const FEATURE_FLAG_KEY = 'feature_flag';

/**
 * Guard that checks if a feature is enabled for the org's current plan.
 * Applied to routes that use premium features.
 *
 * Usage in controller:
 *   @SetMetadata(FEATURE_FLAG_KEY, 'campaigns')
 *   @UseGuards(FeatureFlagGuard)
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  private readonly logger = new Logger(FeatureFlagGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly usageTrackingService: UsageTrackingService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.get<'campaigns' | 'automation' | 'api'>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );

    if (!feature) return true;

    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.orgId ?? request.apiKeyAuth?.orgId;

    if (!orgId) return true;

    const enabled = await this.usageTrackingService.isFeatureEnabled(orgId, feature);

    if (!enabled) {
      this.logger.warn(
        `Feature "${feature}" not available for org ${orgId} on current plan`,
      );

      throw new ForbiddenException({
        statusCode: 403,
        error: 'FEATURE_NOT_AVAILABLE',
        message: `The "${feature}" feature is not included in your current plan. Please upgrade to access this feature.`,
        details: { feature, orgId },
      });
    }

    return true;
  }
}
