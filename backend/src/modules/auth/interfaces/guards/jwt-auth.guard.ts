import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators';
import { IS_SUPER_ADMIN_ROUTE_KEY } from '@/common/decorators/super-admin-route.decorator';
import { TokenService } from '../../domain/services/token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Super admin routes are authenticated by SuperAdminGuard (via @SuperAdminOnly)
    const isSuperAdminRoute = this.reflector.getAllAndOverride<boolean>(IS_SUPER_ADMIN_ROUTE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isSuperAdminRoute) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    // Tenant routes accept tenant tokens only — a super admin token is signed
    // with a different secret and never verifies here
    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      request.user = payload;
      return true;
    } catch {
      // Fall through to the failure log
    }

    // Verification failed — log for intrusion detection
    // Never log the token value itself
    this.logger.warn('JWT authentication failed', {
      ip: request.ip || request.socket?.remoteAddress || 'unknown',
      path: request.url,
      ua: String(request.headers['user-agent'] || '').slice(0, 100),
    });

    throw new UnauthorizedException('Invalid or expired access token');
  }

  private extractTokenFromHeader(request: { headers: { authorization?: string } }): string | null {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }
}
