import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeysRepository } from '../../infrastructure/repositories/api-keys.repository';

/**
 * Guard that authenticates requests via API key in the X-API-Key header.
 * Used for external/third-party integrations.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly repo: ApiKeysRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing X-API-Key header');
    }

    const keyData = await this.repo.validateKey(apiKey);
    if (!keyData) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach org context to request (similar to JWT auth)
    request.apiKeyAuth = {
      orgId: keyData.orgId,
      keyId: keyData.id,
      scopes: keyData.scopes,
    };

    // Update last used IP
    const ip = request.ip || request.connection?.remoteAddress;
    // Fire and forget
    this.repo['prisma']?.apiKey.update({
      where: { id: keyData.id },
      data: { lastUsedIp: ip },
    }).catch(() => {});

    return true;
  }
}
