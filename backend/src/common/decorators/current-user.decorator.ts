import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
  sub: string;          // user ID
  orgId: string;        // organization ID (empty string for super admin)
  role: string;         // user role (empty string for super admin)
  email: string;
  isSuperAdmin?: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayload;
    return data ? user[data] : user;
  },
);
