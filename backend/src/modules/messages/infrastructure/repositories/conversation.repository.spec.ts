import { ConversationRepository } from './conversation.repository';
import { Prisma } from '@prisma/client';

describe('ConversationRepository', () => {
  it('reuses the org contact thread across sessions and phone formatting', async () => {
    const conversation = {
      id: 'conversation-1',
      lastMessageBody: null,
    };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(conversation);
    const create = jest.fn().mockResolvedValue(conversation);
    const update = jest.fn().mockResolvedValue(conversation);
    const repository = new ConversationRepository(
      { conversation: { findFirst, create, update } } as never,
      { decryptIfEncrypted: (value: string | null) => value } as never,
    );

    await repository.findOrCreate({
      orgId: 'org-1',
      sessionId: 'session-1',
      contactPhone: '+1 (415) 555-0123',
    });
    await repository.findOrCreate({
      orgId: 'org-1',
      sessionId: 'session-2',
      contactPhone: '14155550123',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: 'org-1',
          sessionId: 'session-1',
          contactPhone: '+14155550123',
        }),
      }),
    );
    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: { orgId: 'org-1', contactPhone: '+14155550123', sessionId: { not: null } },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'conversation-1' },
        data: expect.objectContaining({
          sessionId: 'session-2',
          deletedAt: null,
        }),
      }),
    );
  });

  it('reuses a legacy WhatsApp conversation when the database rejects a duplicate phone', async () => {
    const conversation = {
      id: 'legacy-conversation',
      lastMessageBody: null,
    };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(conversation);
    const create = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['org_id', 'contact_phone'] },
      }),
    );
    const update = jest.fn().mockResolvedValue(conversation);
    const repository = new ConversationRepository(
      { conversation: { findFirst, create, update } } as never,
      { decryptIfEncrypted: (value: string | null) => value } as never,
    );

    await repository.findOrCreate({
      orgId: 'org-1',
      sessionId: 'session-1',
      contactPhone: '+1 (415) 555-0123',
    });

    expect(findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        orgId: 'org-1',
        contactPhone: '+14155550123',
        OR: [
          { sessionId: { not: null } },
          { channelType: 'WHATSAPP' },
          { channelType: null, channelId: null },
        ],
      },
    });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'legacy-conversation' },
        data: expect.objectContaining({ sessionId: 'session-1', deletedAt: null }),
      }),
    );
  });
});
