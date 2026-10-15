import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CSRF_PROTECTED_KEY, IS_PUBLIC_KEY } from '@/common/decorators';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    // Public routes (login, register, webhooks) are exempt unless marked @CsrfProtected()
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    const forced = this.reflector.getAllAndOverride<boolean>(CSRF_PROTECTED_KEY, targets);
    if (isPublic && !forced) return true;

    const req = context.switchToHttp().getRequest();

    // Only guard state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method as string)) return true;

    if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
      throw new ForbiddenException('CSRF check failed: missing x-requested-with header');
    }
    return true;
  }
}
