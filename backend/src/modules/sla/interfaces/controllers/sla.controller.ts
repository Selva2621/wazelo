import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { CreateSlaPolicyDto } from '../../application/dto/create-sla-policy.dto';
import { UpdateSlaPolicyDto } from '../../application/dto/update-sla-policy.dto';
import {
  ListSlaPoliciesQueryDto,
  ListSlaTrackingsQueryDto,
  ListSlaBreachesQueryDto,
  SlaPerformanceQueryDto,
} from '../../application/dto/sla-query.dto';
import { CreateSlaPolicyUseCase } from '../../application/use-cases/create-sla-policy.use-case';
import { UpdateSlaPolicyUseCase } from '../../application/use-cases/update-sla-policy.use-case';
import { DeleteSlaPolicyUseCase } from '../../application/use-cases/delete-sla-policy.use-case';
import { GetSlaPolicyUseCase } from '../../application/use-cases/get-sla-policy.use-case';
import { ListSlaPoliciesUseCase } from '../../application/use-cases/list-sla-policies.use-case';
import { ListSlaTrackingsUseCase } from '../../application/use-cases/list-sla-trackings.use-case';
import { ListSlaBreachesUseCase } from '../../application/use-cases/list-sla-breaches.use-case';
import { AcknowledgeSlaBreachUseCase } from '../../application/use-cases/acknowledge-sla-breach.use-case';
import { GetSlaPerformanceUseCase } from '../../application/use-cases/get-sla-performance.use-case';

@Controller('sla')
export class SlaController {
  constructor(
    private readonly createSlaPolicyUseCase: CreateSlaPolicyUseCase,
    private readonly updateSlaPolicyUseCase: UpdateSlaPolicyUseCase,
    private readonly deleteSlaPolicyUseCase: DeleteSlaPolicyUseCase,
    private readonly getSlaPolicyUseCase: GetSlaPolicyUseCase,
    private readonly listSlaPoliciesUseCase: ListSlaPoliciesUseCase,
    private readonly listSlaTrackingsUseCase: ListSlaTrackingsUseCase,
    private readonly listSlaBreachesUseCase: ListSlaBreachesUseCase,
    private readonly acknowledgeSlaBreachUseCase: AcknowledgeSlaBreachUseCase,
    private readonly getSlaPerformanceUseCase: GetSlaPerformanceUseCase,
  ) {}

  // ─── Policies ───────────────────────────────

  @Post('policies')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.SLA_CREATE)
  async createPolicy(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSlaPolicyDto,
    @Req() req: Request,
  ) {
    return this.createSlaPolicyUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('policies')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SLA_READ)
  async listPolicies(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSlaPoliciesQueryDto,
  ) {
    return this.listSlaPoliciesUseCase.execute(user.orgId, query);
  }

  @Get('policies/:id')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SLA_READ)
  async getPolicy(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.getSlaPolicyUseCase.execute(user.orgId, id);
  }

  @Patch('policies/:id')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.SLA_UPDATE)
  async updatePolicy(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSlaPolicyDto,
    @Req() req: Request,
  ) {
    return this.updateSlaPolicyUseCase.execute(
      user.orgId,
      user.sub,
      id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete('policies/:id')
  @Roles('ADMIN')
  @Permissions(PERMISSIONS.SLA_DELETE)
  async deletePolicy(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.deleteSlaPolicyUseCase.execute(
      user.orgId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ─── Trackings ──────────────────────────────

  @Get('trackings')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SLA_READ)
  async listTrackings(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSlaTrackingsQueryDto,
  ) {
    return this.listSlaTrackingsUseCase.execute(
      user.orgId,
      user.role,
      user.sub,
      query,
    );
  }

  // ─── Breaches ───────────────────────────────

  @Get('breaches')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SLA_BREACH_READ)
  async listBreaches(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSlaBreachesQueryDto,
  ) {
    return this.listSlaBreachesUseCase.execute(
      user.orgId,
      user.role,
      user.sub,
      query,
    );
  }

  @Post('breaches/:id/acknowledge')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.SLA_BREACH_ACKNOWLEDGE)
  async acknowledgeBreach(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    return this.acknowledgeSlaBreachUseCase.execute(
      user.orgId,
      user.sub,
      id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ─── Performance ────────────────────────────

  @Get('performance')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.SLA_READ)
  async getPerformance(
    @CurrentUser() user: JwtPayload,
    @Query() query: SlaPerformanceQueryDto,
  ) {
    return this.getSlaPerformanceUseCase.execute(
      user.orgId,
      user.role,
      user.sub,
      query,
    );
  }
}
