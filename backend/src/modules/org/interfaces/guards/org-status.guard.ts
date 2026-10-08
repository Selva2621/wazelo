import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { IS_SUPER_ADMIN_ROUTE_KEY } from '@/common/decorators/super-admin-route.decorator';
import { OrgStatusService } from '../../domain/services/org-status.service';

/** Error code the frontend checks to show the "organization suspended" screen. */
export const ORG_SUSPENDED_CODE = 'ORG_SUSPENDED';

export function orgSuspendedException(): ForbiddenException {
  return new ForbiddenException({
    statusCode: 403,
    error: ORG_SUSPENDED_CODE,
    message: 'This organization has been suspended. Contact Wazelo support.',
  });
}

/**
 * Global guard (registered right after JwtAuthGuard): blocks every tenant
 * request from a suspended org. Public and super-admin routes are skipped.
 * API-key routes set their org later, in ApiKeyGuard, which checks too.
 */
@Injectable()
export class OrgStatusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly orgStatus: OrgStatusService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets) ||
      this.reflector.getAllAndOverride<boolean>(IS_SUPER_ADMIN_ROUTE_KEY, targets)
    ) {
      return true;
    }

    const orgId: string | undefined = context.switchToHttp().getRequest().user?.orgId;
    if (await this.orgStatus.isSuspended(orgId)) {
      throw orgSuspendedException();
    }
    return true;
  }
}
