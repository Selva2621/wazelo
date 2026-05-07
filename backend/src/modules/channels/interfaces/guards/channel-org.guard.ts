import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class ChannelOrgGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const channelId =
      request.params.id || request.params.channelId;
    const orgId = request.user?.orgId;

    if (!channelId || !orgId) return true;

    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, orgId, deletedAt: null },
      select: { id: true },
    });

    if (!channel) {
      throw new ForbiddenException(
        'Channel not found in your organization',
      );
    }

    return true;
  }
}
