import {
  Controller, Get, Post, Patch, Body, Param,
  Req, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { ListPlansUseCase } from '@/modules/billing/application/use-cases/list-plans.use-case';
import { CreatePlanDto } from '@/modules/billing/application/dto/create-plan.dto';
import { UpdatePlanDto } from '@/modules/billing/application/dto/update-plan.dto';
import {
  SuperAdminCreatePlanUseCase,
  SuperAdminUpdatePlanUseCase,
} from '../../application/use-cases/super-admin-plans.use-cases';
import { requestMeta } from '../request-meta';

@Controller('super-admin/plans')
@SuperAdminOnly()
export class SuperAdminPlansController {
  constructor(
    private readonly listPlansUseCase: ListPlansUseCase,
    private readonly createPlanUseCase: SuperAdminCreatePlanUseCase,
    private readonly updatePlanUseCase: SuperAdminUpdatePlanUseCase,
  ) {}

  /** Includes inactive plans so they can be reactivated. */
  @Get()
  async listPlans() {
    return this.listPlansUseCase.execute({ includeInactive: true });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() dto: CreatePlanDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.createPlanUseCase.execute({ id: user.sub, email: user.email }, dto, requestMeta(req));
  }

  @Patch(':id')
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updatePlanUseCase.execute({ id: user.sub, email: user.email }, id, dto, requestMeta(req));
  }
}
