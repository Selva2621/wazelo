import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Req, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { CreatePlanDto } from '@/modules/billing/application/dto/create-plan.dto';
import { SuperAdminUpdatePlanDto } from '../../application/dto/super-admin-plan.dto';
import {
  SuperAdminArchivePlanUseCase,
  SuperAdminCreatePlanUseCase,
  SuperAdminDeletePlanUseCase,
  SuperAdminUnarchivePlanUseCase,
  SuperAdminListPlansUseCase,
  SuperAdminUpdatePlanUseCase,
} from '../../application/use-cases/super-admin-plans.use-cases';
import { requestMeta } from '../request-meta';

@Controller('super-admin/plans')
@SuperAdminOnly()
export class SuperAdminPlansController {
  constructor(
    private readonly listPlansUseCase: SuperAdminListPlansUseCase,
    private readonly createPlanUseCase: SuperAdminCreatePlanUseCase,
    private readonly updatePlanUseCase: SuperAdminUpdatePlanUseCase,
    private readonly archivePlanUseCase: SuperAdminArchivePlanUseCase,
    private readonly unarchivePlanUseCase: SuperAdminUnarchivePlanUseCase,
    private readonly deletePlanUseCase: SuperAdminDeletePlanUseCase,
  ) {}

  /** Includes inactive and archived plans, and each plan's live subscriber count. */
  @Get()
  async listPlans() {
    return this.listPlansUseCase.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() dto: CreatePlanDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.createPlanUseCase.execute({ id: user.sub, email: user.email }, dto, requestMeta(req));
  }

  @Patch(':id')
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: SuperAdminUpdatePlanDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    const { mode, ...dto } = body;
    return this.updatePlanUseCase.execute({ id: user.sub, email: user.email }, id, dto, mode, requestMeta(req));
  }

  /** Off sale and out of the default list; existing subscribers keep the plan. */
  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archivePlan(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.archivePlanUseCase.execute({ id: user.sub, email: user.email }, id, requestMeta(req));
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  async unarchivePlan(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.unarchivePlanUseCase.execute({ id: user.sub, email: user.email }, id, requestMeta(req));
  }

  /** Only plans that never had a subscription; otherwise 400 (archive instead). */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePlan(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    await this.deletePlanUseCase.execute({ id: user.sub, email: user.email }, id, requestMeta(req));
  }
}
