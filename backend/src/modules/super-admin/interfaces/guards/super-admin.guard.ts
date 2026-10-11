import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from '@/common/decorators/current-user.decorator';
import { SuperAdminTokenService } from '../../domain/services/super-admin-token.service';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';
import { SuperAdminSessionRepository } from '../../infrastructure/repositories/super-admin-session.repository';

/** request.user on super admin routes; `sessionFamilyId` identifies the current device. */
export interface SuperAdminRequestUser extends JwtPayload {
  sessionFamilyId: string;
}

/**
 * Authenticates super admin routes. Attached via `@SuperAdminOnly()`.
 *
 * Accepts only access tokens signed with the super admin secret, carrying the
 * platform audience, whose tokenVersion still matches the account (sign out
 * everywhere) and whose session family is still active (per-device sign out).
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly tokenService: SuperAdminTokenService,
    private readonly superAdminRepo: SuperAdminRepository,
    private readonly sessionRepo: SuperAdminSessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('Super admin access token required');
    }

    const payload = await this.tokenService.verify(token, 'access');
    const familyId = payload.fid as string;

    const [superAdmin, sessionActive] = await Promise.all([
      this.superAdminRepo.findById(payload.sub),
      this.sessionRepo.familyHasActiveSession(familyId),
    ]);
    if (!superAdmin || superAdmin.disabledAt || superAdmin.tokenVersion !== payload.tv || !sessionActive) {
      throw new UnauthorizedException('Session revoked');
    }

    const user: SuperAdminRequestUser = {
      sub: superAdmin.id,
      email: superAdmin.email,
      orgId: '',
      role: '',
      isSuperAdmin: true,
      sessionFamilyId: familyId,
    };
    request.user = user;
    return true;
  }
}
