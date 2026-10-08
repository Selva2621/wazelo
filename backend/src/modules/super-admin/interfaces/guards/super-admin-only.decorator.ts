import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { IS_SUPER_ADMIN_ROUTE_KEY } from '@/common/decorators/super-admin-route.decorator';
import { SuperAdminGuard } from './super-admin.guard';

/**
 * Marks a controller or handler as super-admin-only.
 *
 * The global tenant guards skip these routes (tenant tokens are never
 * accepted here) and SuperAdminGuard authenticates instead. Always use this
 * decorator — never `@Public()` + `@UseGuards(SuperAdminGuard)`.
 */
export const SuperAdminOnly = () =>
  applyDecorators(SetMetadata(IS_SUPER_ADMIN_ROUTE_KEY, true), UseGuards(SuperAdminGuard));
