import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessageEncryptionService } from '@/modules/messages/domain/services/message-encryption.service';

@Controller('search')
export class SearchController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enc: MessageEncryptionService,
  ) {}

  @Get()
  async search(
    @CurrentUser() user: JwtPayload,
    @Query('q') query: string,
  ) {
    if (!query || query.trim().length < 2) {
      return { contacts: [], conversations: [], campaigns: [] };
    }

    const q = query.trim();
    const orgId = user.orgId;

    const [contacts, conversations, campaigns] = await Promise.all([
      // Search contacts by name, phone, email
      this.prisma.contact.findMany({
        where: {
          orgId,
          deletedAt: null,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phoneNumber: { contains: q } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          leadStatus: true,
          source: true,
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),

      // Search conversations by contact phone (lastMessageBody is encrypted — cannot search by content)
      this.prisma.conversation.findMany({
        where: {
          orgId,
          deletedAt: null,
          contactPhone: { contains: q },
        },
        select: {
          id: true,
          contactId: true,
          contactPhone: true,
          lastMessageAt: true,
          lastMessageBody: true,
          status: true,
        },
        take: 5,
        orderBy: { lastMessageAt: 'desc' },
      }),

      // Search campaigns by name
      this.prisma.campaign.findMany({
        where: {
          orgId,
          deletedAt: null,
          name: { contains: q, mode: 'insensitive' },
        },
        select: {
          id: true,
          name: true,
          status: true,
          totalRecipients: true,
        },
        take: 5,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Decrypt lastMessageBody in conversation results
    const decryptedConversations = conversations.map((c) => ({
      ...c,
      lastMessageBody: this.enc.decryptIfEncrypted(c.lastMessageBody),
    }));

    return { contacts, conversations: decryptedConversations, campaigns };
  }
}
