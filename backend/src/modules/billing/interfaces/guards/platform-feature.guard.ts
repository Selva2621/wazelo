import { applyDecorators, CanActivate, ExecutionContext, Injectable, SetMetadata, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { KillSwitchService } from '../../domain/services/kill-switch.service';
import { FeatureKey } from '../../domain/services/entitlements';

export const PLATFORM_FEATURE_KEY = 'platform_feature';

/**
 * Kill-switch-only check for routes whose feature is not plan-gated (AI,
 * Shopify): 403 FEATURE_DISABLED_PLATFORM while the platform switch is on.
 */
@Injectable()
export class PlatformFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly killSwitches: KillSwitchService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<FeatureKey>(PLATFORM_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (feature) await this.killSwitches.assertEnabled(feature);
    return true;
  }
}

/** `@PlatformFeature('ai')` on a controller or route. */
export const PlatformFeature = (feature: FeatureKey) =>
  applyDecorators(SetMetadata(PLATFORM_FEATURE_KEY, feature), UseGuards(PlatformFeatureGuard));
