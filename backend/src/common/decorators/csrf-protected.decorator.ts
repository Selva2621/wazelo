import { SetMetadata } from '@nestjs/common';

export const CSRF_PROTECTED_KEY = 'csrfProtected';

/**
 * Keeps the CSRF header check on a `@Public()` route. Use it on public routes that act on a
 * cookie (refresh, logout): with SameSite=None, any site could otherwise trigger them.
 */
export const CsrfProtected = () => SetMetadata(CSRF_PROTECTED_KEY, true);
