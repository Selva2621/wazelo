import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly superAdminSecret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.superAdminSecret = this.configService.getOrThrow<string>('jwt.superAdminSecret');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      throw new UnauthorizedException('Super admin access token required');
    }

    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(token, { secret: this.superAdminSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired super admin token');
    }

    if (!payload?.isSuperAdmin) {
      throw new UnauthorizedException('Super admin access required');
    }

    request.user = payload;
    return true;
  }
}
