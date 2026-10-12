import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysRepository } from '../../infrastructure/repositories/api-keys.repository';
import { API_KEY_RESOURCE_KEY, type ApiKeyResource } from './api-key-scope.decorator';
import { OrgStatusService } from '@/modules/org/domain/services/org-status.service';
import { orgSuspendedException } from '@/modules/org/interfaces/guards/org-status.guard';

/**
 * Guard that authenticates requests via API key in the X-API-Key header.
 * Used for external/third-party integrations.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly repo: ApiKeysRepository,
    private readonly orgStatus: OrgStatusService,
    private readonly reflector: Reflector,
  ) {}

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

    // The global OrgStatusGuard runs before the key is resolved, so check here too
    if (await this.orgStatus.isSuspended(keyData.orgId)) {
      throw orgSuspendedException();
    }

    // Scopes: read for GET, write for anything that changes data, plus the
    // endpoint's resource scope (messages / contacts) when it declares one
    const accessScope = request.method === 'GET' ? 'read' : 'write';
    if (!keyData.scopes.includes(accessScope)) {
      throw new ForbiddenException(`This API key needs the '${accessScope}' scope`);
    }
    const resource = this.reflector.getAllAndOverride<ApiKeyResource | undefined>(
      API_KEY_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (resource && !keyData.scopes.includes(resource)) {
      throw new ForbiddenException(`This API key needs the '${resource}' scope`);
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
