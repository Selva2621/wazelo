import {
  Controller, Get, Post, Patch, Body, Param,
  UseGuards, Req, HttpCode, HttpStatus, ParseUUIDPipe,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { ListPlansUseCase } from '@/modules/billing/application/use-cases/list-plans.use-case';
import { CreatePlanUseCase } from '@/modules/billing/application/use-cases/create-plan.use-case';
import { UpdatePlanUseCase } from '@/modules/billing/application/use-cases/update-plan.use-case';
import { CreatePlanDto } from '@/modules/billing/application/dto/create-plan.dto';
import { UpdatePlanDto } from '@/modules/billing/application/dto/update-plan.dto';

@Controller('super-admin/plans')
@Public()
@UseGuards(SuperAdminGuard)
export class SuperAdminPlansController {
  constructor(
    private readonly listPlansUseCase: ListPlansUseCase,
    private readonly createPlanUseCase: CreatePlanUseCase,
    private readonly updatePlanUseCase: UpdatePlanUseCase,
  ) {}

  @Get()
  async listPlans() {
    return this.listPlansUseCase.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPlan(@Body() dto: CreatePlanDto, @Req() req: Request) {
    const user = (req as any).user;
    const ip = req.ip ?? req.socket?.remoteAddress ?? '';
    const ua = req.headers['user-agent'] ?? '';
    return this.createPlanUseCase.execute(user.sub, dto, ip, ua);
  }

  @Patch(':id')
  async updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
    @Req() req: Request,
  ) {
    const user = (req as any).user;
    const ip = req.ip ?? req.socket?.remoteAddress ?? '';
    const ua = req.headers['user-agent'] ?? '';
    return this.updatePlanUseCase.execute(id, user.sub, dto, ip, ua);
  }
}
