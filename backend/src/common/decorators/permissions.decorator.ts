import { SetMetadata } from '@nestjs/common';
import { PermissionString } from '@/modules/rbac/domain/permissions.constants';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint.
 * The user must have ALL listed permissions to access the route.
 *
 * Usage:
 *   @Permissions(PERMISSIONS.CONTACTS_READ)
 *   @Permissions(PERMISSIONS.CONTACTS_READ, PERMISSIONS.CONTACTS_UPDATE)
 *
 * If no @Permissions() decorator is present on a route:
 *   - Authenticated users are allowed (auth-only, no permission check)
 *   - This enables gradual migration without breaking existing endpoints
 */
export const Permissions = (...permissions: PermissionString[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
