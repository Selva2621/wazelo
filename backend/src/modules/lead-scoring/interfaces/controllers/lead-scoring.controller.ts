import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { LeadScoringRepository } from '../../infrastructure/repositories/lead-scoring.repository';
import { LeadScoringService } from '../../domain/services/lead-scoring.service';
import { CreateScoringRuleDto, UpdateScoringRuleDto, SetContactScoreDto } from '../../application/dto';

@Controller('lead-scoring')
export class LeadScoringController {
  constructor(
    private readonly repo: LeadScoringRepository,
    private readonly service: LeadScoringService,
  ) {}

  /* ─── Scoring Rules (Admin) ─── */

  @Post('rules')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async createRule(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: CreateScoringRuleDto,
  ) {
    return this.repo.createRule({ orgId, ...dto });
  }

  @Get('rules')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listRules(@CurrentUser('orgId') orgId: string) {
    return this.repo.findRulesByOrg(orgId);
  }

  @Get('rules/:id')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getRule(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const rule = await this.repo.findRuleById(id, orgId);
    if (!rule) throw new NotFoundException('Scoring rule not found');
    return rule;
  }

  @Patch('rules/:id')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async updateRule(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScoringRuleDto,
  ) {
    const rule = await this.repo.findRuleById(id, orgId);
    if (!rule) throw new NotFoundException('Scoring rule not found');
    await this.repo.updateRule(id, orgId, dto as any);
    return this.repo.findRuleById(id, orgId);
  }

  @Delete('rules/:id')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async deleteRule(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const rule = await this.repo.findRuleById(id, orgId);
    if (!rule) throw new NotFoundException('Scoring rule not found');
    await this.repo.deleteRule(id, orgId);
    return { deleted: true };
  }

  /* ─── Contact Score ─── */

  @Get('contacts/:contactId/score')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getContactScore(
    @CurrentUser('orgId') orgId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
  ) {
    const score = await this.repo.getContactScore(contactId, orgId);
    if (!score) throw new NotFoundException('Contact not found');
    return score;
  }

  @Post('contacts/:contactId/score')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  async setContactScore(
    @CurrentUser('orgId') orgId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Body() dto: SetContactScoreDto,
  ) {
    const contact = await this.repo.getContactScore(contactId, orgId);
    if (!contact) throw new NotFoundException('Contact not found');

    await this.service.setScore({
      contactId,
      orgId,
      currentScore: contact.leadScore,
      newScore: dto.score,
      reason: dto.reason || 'Manual score override',
    });

    return this.repo.getContactScore(contactId, orgId);
  }

  @Get('contacts/:contactId/score-history')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getScoreHistory(
    @CurrentUser('orgId') orgId: string,
    @Param('contactId', ParseUUIDPipe) contactId: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.repo.findScoreHistory(
      contactId,
      orgId,
      take ? parseInt(take, 10) : 20,
      skip ? parseInt(skip, 10) : 0,
    );
  }
}
