import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgStatusService } from '../../domain/services/org-status.service';

const HQ_PROTECTED_KEY = 'hq_protected';

interface HqProtectedMeta {
  action: string;
  /** 'param' = the `:id` route param (super admin routes); 'self' = the caller's own org (tenant routes) */
  org: 'param' | 'self';
}

/**
 * Refuses an org lifecycle or billing action on Wazelo HQ (400 WAZELO_HQ_PROTECTED).
 *   @HqProtected('suspend')                  // super admin: org from :id
 *   @HqProtected('cancel billing on', 'self') // tenant: the caller's org
 *   @UseGuards(NotWazeloHqGuard)
 */
export const HqProtected = (action: string, org: HqProtectedMeta['org'] = 'param') =>
  SetMetadata(HQ_PROTECTED_KEY, { action, org } satisfies HqProtectedMeta);

@Injectable()
export class NotWazeloHqGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly orgStatus: OrgStatusService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.get<HqProtectedMeta>(HQ_PROTECTED_KEY, context.getHandler());
    if (!meta) return true;
    const req = context.switchToHttp().getRequest();
    const orgId: string | undefined = meta.org === 'self' ? req.user?.orgId : req.params?.id;
    if (orgId) await this.orgStatus.assertNotInternal(orgId, meta.action);
    return true;
  }
}
