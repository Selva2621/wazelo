import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators';
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

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    // Try normal user JWT first
    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      request.user = payload;
      return true;
    } catch {
      // Fall through — may be a super admin token
    }

    // Try super admin JWT secret via TokenService
    try {
      const payload = await this.tokenService.verifySuperAdminToken(token);
      if (payload?.isSuperAdmin) {
        request.user = payload;
        return true;
      }
    } catch {
      // Not a valid super admin token either
    }

    // Both verification paths failed — log for intrusion detection
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
