import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Public routes (login, register, refresh) are exempt
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();

    // Only guard state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method as string)) return true;

    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      throw new ForbiddenException('CSRF check failed: missing x-requested-with header');
    }
    return true;
  }
}
