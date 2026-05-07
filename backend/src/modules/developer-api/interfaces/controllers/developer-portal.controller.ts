import {
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { DeveloperApiRepository } from '../../infrastructure/repositories/developer-api.repository';

/**
 * Developer Portal UI API — authenticated via JWT (normal login).
 * These endpoints serve the frontend developer dashboard.
 */
@Controller('developer/portal')
export class DeveloperPortalController {
  constructor(private readonly repo: DeveloperApiRepository) {}

  @Get('dashboard')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getDashboard(@CurrentUser('orgId') orgId: string) {
    return this.repo.getDashboardStats(orgId);
  }

  @Get('logs')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getLogs(
    @CurrentUser('orgId') orgId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.repo.getApiLogs(orgId, Number(limit) || 20, cursor);
  }
}
