import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtPayload } from '@/common/decorators/current-user.decorator';
import { SuperAdminTokenService } from '../../domain/services/super-admin-token.service';
import { SuperAdminRepository } from '../../infrastructure/repositories/super-admin.repository';

/**
 * Authenticates super admin routes. Attached via `@SuperAdminOnly()`.
 *
 * Accepts only access tokens signed with the super admin secret, carrying the
 * platform audience, whose tokenVersion still matches the account — so logout
 * revokes every outstanding token immediately.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly tokenService: SuperAdminTokenService,
    private readonly superAdminRepo: SuperAdminRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('Super admin access token required');
    }

    const payload = await this.tokenService.verify(token, 'access');

    const superAdmin = await this.superAdminRepo.findById(payload.sub);
    if (!superAdmin || superAdmin.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Session revoked');
    }

    const user: JwtPayload = {
      sub: superAdmin.id,
      email: superAdmin.email,
      orgId: '',
      role: '',
      isSuperAdmin: true,
    };
    request.user = user;
    return true;
  }
}
