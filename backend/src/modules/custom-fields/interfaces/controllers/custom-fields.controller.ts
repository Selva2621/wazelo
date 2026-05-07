import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { CustomFieldsRepository } from '../../infrastructure/repositories/custom-fields.repository';
import { CreateFieldDefinitionDto, UpdateFieldDefinitionDto, SetFieldValuesDto } from '../../application/dto';

@Controller('custom-fields')
export class CustomFieldsController {
  constructor(private readonly repo: CustomFieldsRepository) {}

  /* ─── Field Definitions ─── */

  @Post('definitions')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async createDefinition(@CurrentUser('orgId') orgId: string, @Body() dto: CreateFieldDefinitionDto) {
    return this.repo.createDefinition({ orgId, ...dto });
  }

  @Get('definitions')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listDefinitions(@CurrentUser('orgId') orgId: string, @Query('entity') entity?: string) {
    return this.repo.findDefinitions(orgId, entity);
  }

  @Patch('definitions/:id')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async updateDefinition(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFieldDefinitionDto,
  ) {
    await this.repo.updateDefinition(id, orgId, dto);
    return this.repo.findDefinitionById(id, orgId);
  }

  @Delete('definitions/:id')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async deleteDefinition(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.repo.deleteDefinition(id, orgId);
    return { deleted: true };
  }

  /* ─── Field Values ─── */

  @Post('values/:entityId')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  async setValues(
    @CurrentUser('orgId') orgId: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Body() dto: SetFieldValuesDto,
  ) {
    return this.repo.setValues(orgId, entityId, dto.values);
  }

  @Get('values/:entityId')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getValues(@CurrentUser('orgId') orgId: string, @Param('entityId', ParseUUIDPipe) entityId: string) {
    return this.repo.getValues(orgId, entityId);
  }
}
