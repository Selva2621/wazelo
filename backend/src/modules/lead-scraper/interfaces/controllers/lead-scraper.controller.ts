import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { TriggerScrapeRunUseCase } from '../../application/use-cases/trigger-scrape-run.use-case';
import { ListScrapeRunsUseCase } from '../../application/use-cases/list-scrape-runs.use-case';
import { ImportScrapeResultsUseCase } from '../../application/use-cases/import-scrape-results.use-case';
import { CheckWhatsAppUseCase } from '../../application/use-cases/check-whatsapp.use-case';
import { WhatsAppCheckRunUseCase } from '../../application/use-cases/whatsapp-check-run.use-case';
import { ScrapeRunRepository } from '../../infrastructure/repositories/scrape-run.repository';
import { TriggerScrapeDto, LeadFiltersDto } from '../../application/dto/trigger-scrape.dto';
import { ListScrapeRunsQueryDto } from '../../application/dto/list-scrape-runs-query.dto';
import { ImportScrapeResultsDto } from '../../application/dto/import-scrape-results.dto';
import { GetScrapeRunResultsUseCase } from '../../application/use-cases/get-scrape-run-results.use-case';
import { ScrapeRunStatus } from '@prisma/client';

@Controller('lead-scraper')
export class LeadScraperController {
  constructor(
    private readonly triggerScrapeRunUseCase: TriggerScrapeRunUseCase,
    private readonly listScrapeRunsUseCase: ListScrapeRunsUseCase,
    private readonly scrapeRunRepository: ScrapeRunRepository,
    private readonly importScrapeResultsUseCase: ImportScrapeResultsUseCase,
    private readonly checkWhatsAppUseCase: CheckWhatsAppUseCase,
    private readonly whatsAppCheckRunUseCase: WhatsAppCheckRunUseCase,
    private readonly getScrapeRunResultsUseCase: GetScrapeRunResultsUseCase,
  ) {}

  @Post('runs')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async triggerRun(
    @CurrentUser() user: JwtPayload,
    @Body() dto: TriggerScrapeDto,
  ) {
    return this.triggerScrapeRunUseCase.execute(user.orgId, user.sub, dto);
  }

  @Get('runs')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async listRuns(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListScrapeRunsQueryDto,
  ) {
    return this.listScrapeRunsUseCase.execute(user.orgId, {
      skip: query.skip,
      take: query.take,
      status: query.status,
      source: query.source,
    });
  }

  @Delete('runs/:id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async deleteRun(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const run = await this.scrapeRunRepository.findById(id);
    if (!run || run.orgId !== user.orgId) throw new NotFoundException('Scrape run not found');
    if (run.status === 'RUNNING') throw new ForbiddenException('Cannot delete a run that is currently running');
    await this.scrapeRunRepository.delete(id);
    return { success: true };
  }

  @Post('runs/:id/cancel')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async cancelRun(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const run = await this.scrapeRunRepository.findById(id);
    if (!run || run.orgId !== user.orgId) throw new NotFoundException('Scrape run not found');
    const cancelled = await this.scrapeRunRepository.transition(
      id,
      [ScrapeRunStatus.PENDING, ScrapeRunStatus.RUNNING],
      { status: ScrapeRunStatus.CANCELLED, completedAt: new Date() },
    );
    if (!cancelled) throw new BadRequestException('Only pending or running runs can be cancelled');
    return { success: true };
  }

  @Post('runs/:id/re-run')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async reRun(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const run = await this.scrapeRunRepository.findById(id);
    if (!run || run.orgId !== user.orgId) throw new NotFoundException('Scrape run not found');
    return this.triggerScrapeRunUseCase.execute(user.orgId, user.sub, {
      source: run.source,
      keywords: run.keywords,
      location: run.location ?? undefined,
      maxResults: run.maxResults,
      filters: (run.filters as LeadFiltersDto | null) ?? undefined,
    });
  }

  @Get('runs/:id')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getRun(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const run = await this.scrapeRunRepository.findById(id);
    if (!run || run.orgId !== user.orgId) {
      throw new NotFoundException('Scrape run not found');
    }
    return run;
  }

  @Get('runs/:id/results')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async getRunResults(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.getScrapeRunResultsUseCase.execute(user.orgId, id, Number(skip) || 0, Number(take) || undefined);
  }

  @Post('runs/:id/import')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  async importResults(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImportScrapeResultsDto,
  ) {
    const run = await this.scrapeRunRepository.findById(id);
    if (!run || run.orgId !== user.orgId) throw new NotFoundException('Scrape run not found');
    return this.importScrapeResultsUseCase.execute(user.orgId, user.sub, id, dto.resultIds ?? []);
  }

  /** Start a background WhatsApp check of this run's numbers (all, or only `resultIds`) */
  @Post('runs/:id/wa-check')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async startWhatsAppCheck(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ImportScrapeResultsDto,
  ) {
    return this.whatsAppCheckRunUseCase.start(user.orgId, id, dto.resultIds);
  }

  @Post('runs/:id/wa-check/stop')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async stopWhatsAppCheck(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.whatsAppCheckRunUseCase.stop(user.orgId, id);
    return { success: true };
  }

  @Get('check-whatsapp')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  async checkWhatsApp(
    @CurrentUser() user: JwtPayload,
    @Query('phone') phone: string,
  ) {
    if (!phone) throw new BadRequestException('phone query param is required');
    return this.checkWhatsAppUseCase.execute(user.orgId, phone);
  }
}
