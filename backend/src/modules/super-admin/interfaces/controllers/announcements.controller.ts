import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import {
  DismissAnnouncementUseCase,
  GetActiveAnnouncementsUseCase,
} from '../../application/use-cases/announcements.use-cases';

/**
 * Tenant-facing: announcements for the signed-in user's org (any role).
 * Super admins manage them under /super-admin/announcements.
 */
@Controller('announcements')
export class AnnouncementsController {
  constructor(
    private readonly getActiveUseCase: GetActiveAnnouncementsUseCase,
    private readonly dismissUseCase: DismissAnnouncementUseCase,
  ) {}

  @Get('active')
  async active(@CurrentUser() user: JwtPayload) {
    return this.getActiveUseCase.execute(user.orgId, user.sub);
  }

  @Post(':id/dismiss')
  @HttpCode(HttpStatus.NO_CONTENT)
  async dismiss(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    await this.dismissUseCase.execute(id, user.orgId, user.sub);
  }
}
