/**
 * Metadata key marking a route as super-admin-only.
 *
 * Set ONLY by `@SuperAdminOnly()` (modules/super-admin), which also attaches
 * SuperAdminGuard. The global JwtAuthGuard / PermissionsGuard skip tenant
 * checks on these routes and leave authentication to SuperAdminGuard.
 * There is deliberately no metadata-only decorator exported from here —
 * marking a route without the guard would leave it unauthenticated.
 */
export const IS_SUPER_ADMIN_ROUTE_KEY = 'isSuperAdminRoute';
