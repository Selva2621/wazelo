import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { SuperAdminOnly } from '../guards/super-admin-only.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { ListSuperAdminNotificationsQueryDto } from '../../application/dto/super-admin-notification.dto';
import {
  ListSuperAdminNotificationsUseCase,
  MarkAllSuperAdminNotificationsReadUseCase,
  MarkSuperAdminNotificationReadUseCase,
} from '../../application/use-cases/super-admin-notifications.use-cases';

/** The signed-in super admin's own inbox. */
@Controller('super-admin/notifications')
@SuperAdminOnly()
export class SuperAdminNotificationsController {
  constructor(
    private readonly listUseCase: ListSuperAdminNotificationsUseCase,
    private readonly markReadUseCase: MarkSuperAdminNotificationReadUseCase,
    private readonly markAllReadUseCase: MarkAllSuperAdminNotificationsReadUseCase,
  ) {}

  @Get()
  async list(@Query() query: ListSuperAdminNotificationsQueryDto, @CurrentUser() user: JwtPayload) {
    return this.listUseCase.execute(user.sub, query.unreadOnly === true);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: JwtPayload) {
    return this.markAllReadUseCase.execute(user.sub);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markRead(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.markReadUseCase.execute(user.sub, id);
  }
}
