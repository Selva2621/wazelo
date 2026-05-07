import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { FeatureFlagGuard, FEATURE_FLAG_KEY } from '@/modules/billing/interfaces/guards/feature-flag.guard';
import {
  CreateAutomationRuleDto,
  UpdateAutomationRuleDto,
  ListAutomationRulesDto,
  ListExecutionLogsDto,
} from '../../application/dto';
import {
  CreateAutomationRuleUseCase,
  UpdateAutomationRuleUseCase,
  ToggleAutomationRuleUseCase,
  DeleteAutomationRuleUseCase,
  GetAutomationRuleUseCase,
  ListAutomationRulesUseCase,
  ListExecutionLogsUseCase,
} from '../../application/use-cases';
import { GenerateAutomationRuleUseCase } from '../../application/use-cases/generate-automation-rule.use-case';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { UsageTrackingService } from '@/modules/billing/domain/services/usage-tracking.service';
import { UsageMetricType } from '@prisma/client';
import { IsString, MaxLength } from 'class-validator';

class GenerateAutomationRuleDto {
  @IsString()
  @MaxLength(500)
  prompt: string;
}

@Controller('automation')
export class AutomationController {
  constructor(
    private readonly createRuleUseCase: CreateAutomationRuleUseCase,
    private readonly updateRuleUseCase: UpdateAutomationRuleUseCase,
    private readonly toggleRuleUseCase: ToggleAutomationRuleUseCase,
    private readonly deleteRuleUseCase: DeleteAutomationRuleUseCase,
    private readonly getRuleUseCase: GetAutomationRuleUseCase,
    private readonly listRulesUseCase: ListAutomationRulesUseCase,
    private readonly listExecutionLogsUseCase: ListExecutionLogsUseCase,
    private readonly generateRuleUseCase: GenerateAutomationRuleUseCase,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  @Post('rules/generate')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.AUTOMATION_CREATE)
  @UseGuards(FeatureFlagGuard, UsageLimitGuard)
  @SetMetadata(FEATURE_FLAG_KEY, 'automation')
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  @HttpCode(HttpStatus.OK)
  async generateRule(
    @Body() dto: GenerateAutomationRuleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.generateRuleUseCase.execute(user.orgId, dto.prompt);
    await this.usageTracking.incrementUsage(user.orgId, UsageMetricType.AI_CREDITS);
    return result;
  }

  @Post('rules')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.AUTOMATION_CREATE)
  @UseGuards(FeatureFlagGuard)
  @SetMetadata(FEATURE_FLAG_KEY, 'automation')
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @Body() dto: CreateAutomationRuleDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.createRuleUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Get('rules')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.AUTOMATION_READ)
  async listRules(
    @Query() dto: ListAutomationRulesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listRulesUseCase.execute(user.orgId, dto);
  }

  @Get('rules/:id')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.AUTOMATION_READ)
  async getRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getRuleUseCase.execute(id, user.orgId);
  }

  @Patch('rules/:id')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.AUTOMATION_UPDATE)
  @UseGuards(FeatureFlagGuard)
  @SetMetadata(FEATURE_FLAG_KEY, 'automation')
  async updateRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationRuleDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updateRuleUseCase.execute(
      id,
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post('rules/:id/enable')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.AUTOMATION_UPDATE)
  @HttpCode(HttpStatus.OK)
  async enableRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.toggleRuleUseCase.execute(
      id,
      user.orgId,
      user.sub,
      true,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post('rules/:id/disable')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.AUTOMATION_UPDATE)
  @HttpCode(HttpStatus.OK)
  async disableRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.toggleRuleUseCase.execute(
      id,
      user.orgId,
      user.sub,
      false,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Delete('rules/:id')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.AUTOMATION_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.deleteRuleUseCase.execute(
      id,
      user.orgId,
      user.sub,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Get('logs')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.AUTOMATION_LOGS_READ)
  async listExecutionLogs(
    @Query() dto: ListExecutionLogsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listExecutionLogsUseCase.execute(user.orgId, dto);
  }

  private extractIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private extractUserAgent(req: Request): string {
    return (req.headers['user-agent'] as string) || 'unknown';
  }
}
