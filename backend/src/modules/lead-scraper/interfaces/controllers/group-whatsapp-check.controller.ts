import { Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { GroupWhatsAppCheckUseCase } from '../../application/use-cases/group-whatsapp-check.use-case';

/**
 * "Check numbers on WhatsApp" for a saved contact group. Lives with the
 * lead-scraper checks because they share the per-number lookup throttle.
 */
@Controller('contacts/saved-groups')
export class GroupWhatsAppCheckController {
  constructor(private readonly groupCheck: GroupWhatsAppCheckUseCase) {}

  @Post(':groupId/wa-check')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  start(@CurrentUser() user: JwtPayload, @Param('groupId', ParseUUIDPipe) groupId: string) {
    return this.groupCheck.start(user.orgId, groupId);
  }

  @Post(':groupId/wa-check/stop')
  @Permissions(PERMISSIONS.CONTACTS_UPDATE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async stop(@CurrentUser() user: JwtPayload, @Param('groupId', ParseUUIDPipe) groupId: string) {
    await this.groupCheck.stop(user.orgId, groupId);
  }
}
