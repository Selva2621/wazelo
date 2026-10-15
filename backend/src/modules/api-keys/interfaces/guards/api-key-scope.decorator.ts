import { SetMetadata } from '@nestjs/common';

export const API_KEY_RESOURCE_KEY = 'apiKeyResource';

/** Resource scopes an API key can be granted, besides `read` / `write`. */
export type ApiKeyResource = 'messages' | 'contacts';

/**
 * Marks which resource scope an API-key endpoint needs. ApiKeyGuard also
 * requires `read` for GET requests and `write` for everything else.
 */
export const ApiKeyResourceScope = (resource: ApiKeyResource) =>
  SetMetadata(API_KEY_RESOURCE_KEY, resource);
