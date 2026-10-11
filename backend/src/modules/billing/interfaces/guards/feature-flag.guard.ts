import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsageTrackingService } from '../../domain/services/usage-tracking.service';
import { FeatureDisabledPlatformException, KillSwitchService } from '../../domain/services/kill-switch.service';
import { FeatureKey } from '../../domain/services/entitlements';

/**
 * Decorator key to attach feature flag metadata to a route.
 * Usage: @SetMetadata(FEATURE_FLAG_KEY, 'campaigns')
 */
export const FEATURE_FLAG_KEY = 'feature_flag';

/**
 * Guard that checks if a feature is enabled for the org's current plan.
 * Applied to routes that use premium features. A platform kill switch
 * denies the feature for every org (403 FEATURE_DISABLED_PLATFORM).
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
    private readonly killSwitches: KillSwitchService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Handler or class-level metadata (the developer API sets it on the class)
    const feature = this.reflector.getAllAndOverride<FeatureKey>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) return true;
    await this.killSwitches.assertEnabled(feature);

    const request = context.switchToHttp().getRequest();
    const orgId = request.user?.orgId ?? request.apiKeyAuth?.orgId;

    if (!orgId) return true;

    const access = await this.usageTrackingService.getFeatureAccess(orgId, feature);

    if (access.source === 'PLATFORM') throw new FeatureDisabledPlatformException(feature);

    if (!access.enabled) {
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
