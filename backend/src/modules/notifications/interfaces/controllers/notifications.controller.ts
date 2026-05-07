import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Query,
  Param,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import {
  CurrentUser,
  JwtPayload,
} from '@/common/decorators/current-user.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { ListNotificationsUseCase } from '../../application/use-cases/list-notifications.use-case';
import { MarkNotificationsReadUseCase } from '../../application/use-cases/mark-notifications-read.use-case';
import { DeleteNotificationsUseCase } from '../../application/use-cases/delete-notifications.use-case';
import { ManagePreferencesUseCase } from '../../application/use-cases/manage-preferences.use-case';
import { GetUnreadCountUseCase } from '../../application/use-cases/get-unread-count.use-case';
import { ListNotificationsDto } from '../../application/dto/list-notifications.dto';
import { MarkNotificationsReadDto } from '../../application/dto/mark-notifications-read.dto';
import { DeleteNotificationsDto } from '../../application/dto/delete-notifications.dto';
import { UpdateNotificationPreferenceDto } from '../../application/dto/update-notification-preference.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationsReadUseCase: MarkNotificationsReadUseCase,
    private readonly deleteNotificationsUseCase: DeleteNotificationsUseCase,
    private readonly managePreferencesUseCase: ManagePreferencesUseCase,
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
  ) {}

  /**
   * GET /notifications
   * List notifications for the current user with pagination and filtering.
   */
  @Get()
  @Permissions(PERMISSIONS.NOTIFICATIONS_READ)
  async list(
    @CurrentUser() user: JwtPayload,
    @Query() dto: ListNotificationsDto,
  ) {
    return this.listNotificationsUseCase.execute(user.orgId, user.sub, dto);
  }

  /**
   * GET /notifications/unread-count
   * Get the unread notification count for badge display.
   */
  @Get('unread-count')
  @Permissions(PERMISSIONS.NOTIFICATIONS_READ)
  async getUnreadCount(@CurrentUser() user: JwtPayload) {
    return this.getUnreadCountUseCase.execute(user.orgId, user.sub);
  }

  /**
   * PATCH /notifications/read
   * Mark specific notifications as read.
   */
  @Patch('read')
  @Permissions(PERMISSIONS.NOTIFICATIONS_READ)
  async markAsRead(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MarkNotificationsReadDto,
  ) {
    return this.markNotificationsReadUseCase.markSelected(
      user.orgId,
      user.sub,
      dto.notificationIds,
    );
  }

  /**
   * PATCH /notifications/read-all
   * Mark all notifications as read.
   */
  @Patch('read-all')
  @Permissions(PERMISSIONS.NOTIFICATIONS_READ)
  async markAllAsRead(@CurrentUser() user: JwtPayload) {
    return this.markNotificationsReadUseCase.markAll(user.orgId, user.sub);
  }

  /**
   * DELETE /notifications
   * Delete specific notifications.
   */
  @Delete()
  @Permissions(PERMISSIONS.NOTIFICATIONS_MANAGE)
  @HttpCode(HttpStatus.OK)
  async deleteNotifications(
    @CurrentUser() user: JwtPayload,
    @Body() dto: DeleteNotificationsDto,
  ) {
    return this.deleteNotificationsUseCase.deleteSelected(
      user.orgId,
      user.sub,
      dto.notificationIds,
    );
  }

  /**
   * DELETE /notifications/read
   * Delete all read notifications (cleanup).
   */
  @Delete('read')
  @Permissions(PERMISSIONS.NOTIFICATIONS_MANAGE)
  @HttpCode(HttpStatus.OK)
  async deleteAllRead(@CurrentUser() user: JwtPayload) {
    return this.deleteNotificationsUseCase.deleteAllRead(
      user.orgId,
      user.sub,
    );
  }

  // ─── Preferences ───

  /**
   * GET /notifications/preferences
   * Get all notification preferences for the current user.
   */
  @Get('preferences')
  @Permissions(PERMISSIONS.NOTIFICATIONS_READ)
  async getPreferences(@CurrentUser() user: JwtPayload) {
    return this.managePreferencesUseCase.getPreferences(
      user.orgId,
      user.sub,
    );
  }

  /**
   * PATCH /notifications/preferences
   * Update a single notification preference.
   */
  @Patch('preferences')
  @Permissions(PERMISSIONS.NOTIFICATIONS_MANAGE)
  async updatePreference(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateNotificationPreferenceDto,
    @Req() req: Request,
  ) {
    return this.managePreferencesUseCase.updatePreference(
      user.orgId,
      user.sub,
      dto,
      req.ip,
      req.headers['user-agent'] as string,
    );
  }
}
