import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  ArchiveAnnouncementUseCase,
  CreateAnnouncementUseCase,
  ListAnnouncementsUseCase,
  RestoreAnnouncementUseCase,
  UpdateAnnouncementUseCase,
} from '../../application/use-cases/announcements.use-cases';
import { CreateAnnouncementDto, UpdateAnnouncementDto } from '../../application/dto/announcement.dto';
import { requestMeta } from '../request-meta';

@Controller('super-admin/announcements')
@SuperAdminOnly()
export class SuperAdminAnnouncementsController {
  constructor(
    private readonly createUseCase: CreateAnnouncementUseCase,
    private readonly listUseCase: ListAnnouncementsUseCase,
    private readonly archiveUseCase: ArchiveAnnouncementUseCase,
    private readonly restoreUseCase: RestoreAnnouncementUseCase,
    private readonly updateUseCase: UpdateAnnouncementUseCase,
  ) {}

  @Get()
  async list() {
    return this.listUseCase.execute();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAnnouncementDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.createUseCase.execute(dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnnouncementDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updateUseCase.execute(id, dto, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  async archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.archiveUseCase.execute(id, { id: user.sub, email: user.email }, requestMeta(req));
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    return this.restoreUseCase.execute(id, { id: user.sub, email: user.email }, requestMeta(req));
  }
}
