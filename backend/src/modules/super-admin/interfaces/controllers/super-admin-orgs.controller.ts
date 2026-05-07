import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { GetPlatformStatsUseCase } from '../../application/use-cases/get-platform-stats.use-case';
import { GetAllOrgsUseCase } from '../../application/use-cases/get-all-orgs.use-case';
import { GetOrgDetailUseCase } from '../../application/use-cases/get-org-detail.use-case';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Controller('super-admin')
@Public()
@UseGuards(SuperAdminGuard)
export class SuperAdminOrgsController {
  constructor(
    private readonly getStatsUseCase: GetPlatformStatsUseCase,
    private readonly getAllOrgsUseCase: GetAllOrgsUseCase,
    private readonly getOrgDetailUseCase: GetOrgDetailUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  async getStats() {
    return this.getStatsUseCase.execute();
  }

  @Get('organizations')
  async listOrgs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.getAllOrgsUseCase.execute({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      status,
    });
  }

  @Get('organizations/:id')
  async getOrg(@Param('id', ParseUUIDPipe) id: string) {
    return this.getOrgDetailUseCase.execute(id);
  }

  @Get('subscriptions')
  async listSubscriptions(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pg = page ? parseInt(page) : 1;
    const lm = Math.min(limit ? parseInt(limit) : 20, 100);
    const skip = (pg - 1) * lm;

    const where: any = {};
    if (status) where.status = status;

    const [subscriptions, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: lm,
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
          organization: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      subscriptions,
      total,
      page: pg,
      limit: lm,
      totalPages: Math.ceil(total / lm),
    };
  }
}
