import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ProposalPdf, ProposalPdfUseCase } from '../../application/use-cases/proposal-pdf.use-case';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { ManageProposalsUseCase } from '../../application/use-cases/manage-proposals.use-case';
import { DraftProposalUseCase } from '../../application/use-cases/draft-proposal.use-case';
import { SendProposalUseCase } from '../../application/use-cases/send-proposal.use-case';
import { RespondProposalUseCase } from '../../application/use-cases/respond-proposal.use-case';
import { ImproveProposalUseCase } from '../../application/use-cases/improve-proposal.use-case';
import {
  AcceptProposalDto, CreateProposalDto, ImproveSectionDto, ListProposalsQuery, RequestChangesDto, UpdateProposalDto,
} from '../../application/dto/proposal.dto';

/** Streams a PDF with a proper (UTF-8 safe) file name; skips the JSON envelope. */
function sendPdf(res: Response, file: ProposalPdf, disposition: 'inline' | 'attachment') {
  const ascii = file.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(file.pdf.length));
  res.setHeader('Content-Disposition', `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(file.pdf);
}

/** The owner's proposals (same access as deals). */
@Controller('proposals')
export class ProposalsController {
  constructor(
    private readonly manage: ManageProposalsUseCase,
    private readonly draft: DraftProposalUseCase,
    private readonly send: SendProposalUseCase,
    private readonly improveSection: ImproveProposalUseCase,
    private readonly pdf: ProposalPdfUseCase,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  create(@CurrentUser('orgId') orgId: string, @CurrentUser('sub') userId: string, @Body() dto: CreateProposalDto) {
    return this.manage.create(orgId, userId, dto);
  }

  @Get()
  @Permissions(PERMISSIONS.CONTACTS_READ)
  list(@CurrentUser('orgId') orgId: string, @Query() query: ListProposalsQuery) {
    return this.manage.list(orgId, query);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  get(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.manage.get(orgId, id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  update(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProposalDto) {
    return this.manage.update(orgId, id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  remove(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.manage.remove(orgId, id);
  }

  @Post(':id/draft')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  aiDraft(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.draft.execute(orgId, id);
  }

  @Post(':id/send')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  sendNow(@CurrentUser('orgId') orgId: string, @CurrentUser('sub') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.send.execute(orgId, userId, id);
  }

  @Get(':id/pdf')
  @Permissions(PERMISSIONS.CONTACTS_READ)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async downloadPdf(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    sendPdf(res, await this.pdf.forOwner(orgId, id), 'attachment');
  }

  @Post(':id/improve')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  improve(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ImproveSectionDto) {
    return this.improveSection.execute(orgId, id, dto.section, dto.text);
  }

  @Post(':id/share')
  @Permissions(PERMISSIONS.CONTACTS_CREATE)
  @HttpCode(HttpStatus.OK)
  share(@CurrentUser('orgId') orgId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.send.share(orgId, id);
  }
}

/** The client's link (/p/:token). The unguessable token is the only credential. */
@Public()
@Controller('public/proposals')
export class PublicProposalsController {
  constructor(
    private readonly respond: RespondProposalUseCase,
    private readonly pdf: ProposalPdfUseCase,
  ) {}

  // Before ':token' so "…/pdf" isn't read as a token
  @Get(':token/pdf')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  async downloadPdf(@Param('token') token: string, @Res() res: Response) {
    sendPdf(res, await this.pdf.forClient(token), 'inline');
  }

  @Get(':token')
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  view(@Param('token') token: string) {
    return this.respond.view(token);
  }

  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  accept(@Param('token') token: string, @Body() dto: AcceptProposalDto) {
    return this.respond.accept(token, dto.name);
  }

  @Post(':token/changes')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  requestChanges(@Param('token') token: string, @Body() dto: RequestChangesDto) {
    return this.respond.requestChanges(token, dto.note);
  }
}
