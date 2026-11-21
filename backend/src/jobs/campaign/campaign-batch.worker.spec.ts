import { CampaignRecipientStatus } from '@prisma/client';
import { CampaignBatchWorker } from './campaign-batch.worker';
import { NO_WHATSAPP_PERMISSION_REASON } from '@/modules/contacts/domain/services/whatsapp-permission.service';

const contact = {
  id: 'c1',
  optedOut: false,
  phoneNumber: '+919000000001',
  name: 'Asha',
  email: null,
  leadStatus: 'NEW',
  source: 'WEB_SCRAPE',
};

function setup(permitted: boolean, found: Record<string, unknown> = contact) {
  const queueService = { publishOnce: jest.fn(async () => 'job') };
  const recipientRepo = { updateStatus: jest.fn(async () => undefined) };
  const messageRepo = {
    findByIdempotencyKey: jest.fn(async () => null),
    create: jest.fn(async () => ({ id: 'm1' })),
  };
  const conversationRepo = {
    findOrCreate: jest.fn(async () => ({ id: 'conv1' })),
    updateLastMessage: jest.fn(async () => undefined),
  };
  const messageEventRepo = { record: jest.fn(async () => undefined) };
  const prisma = { contact: { findFirst: jest.fn(async () => found) } };
  const permission = { isPermitted: jest.fn(async () => permitted) };
  const worker = new CampaignBatchWorker(
    queueService as never,
    {} as never,
    recipientRepo as never,
    messageRepo as never,
    conversationRepo as never,
    messageEventRepo as never,
    prisma as never,
    {} as never,
    { emit: jest.fn() } as never,
    {} as never,
    {} as never,
    permission as never,
  );
  const processRecipient = (worker as unknown as {
    processRecipient: (r: Record<string, unknown>, c: Record<string, unknown>, s: string, o: string) => Promise<boolean>;
  }).processRecipient.bind(worker);
  return { processRecipient, recipientRepo, messageRepo, conversationRepo, permission, queueService };
}

const recipient = { id: 'r1', contactId: 'c1', contactPhone: '+919000000001', batchNumber: 1 };
const campaign = { id: 'camp1', messageBody: 'Hi {{name}}', messageType: 'TEXT' };

describe('CampaignBatchWorker WhatsApp permission re-check', () => {
  it('skips a lead finder contact without WhatsApp permission at send time, with the reason', async () => {
    const { processRecipient, recipientRepo, messageRepo, conversationRepo, permission } = setup(false);
    await expect(processRecipient(recipient, campaign, 's1', 'o1')).resolves.toBe(false);
    expect(permission.isPermitted).toHaveBeenCalledWith('o1', contact);
    expect(recipientRepo.updateStatus).toHaveBeenCalledWith('r1', CampaignRecipientStatus.SKIPPED, {
      failedReason: NO_WHATSAPP_PERMISSION_REASON,
      processedAt: expect.any(Date),
    });
    expect(conversationRepo.findOrCreate).not.toHaveBeenCalled();
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it('sends to a permitted contact', async () => {
    const { processRecipient, recipientRepo, messageRepo, queueService } = setup(true);
    await expect(processRecipient(recipient, campaign, 's1', 'o1')).resolves.toBe(true);
    expect(messageRepo.create).toHaveBeenCalled();
    expect(queueService.publishOnce).toHaveBeenCalled();
    expect(recipientRepo.updateStatus).toHaveBeenCalledWith('r1', CampaignRecipientStatus.QUEUED, { messageId: 'm1' });
  });

  it('an opted-out contact is skipped for that reason before the permission check', async () => {
    const { processRecipient, recipientRepo, permission } = setup(false, { ...contact, optedOut: true });
    await processRecipient(recipient, campaign, 's1', 'o1');
    expect(recipientRepo.updateStatus).toHaveBeenCalledWith('r1', CampaignRecipientStatus.SKIPPED, expect.objectContaining({ failedReason: 'Contact opted out' }));
    expect(permission.isPermitted).not.toHaveBeenCalled();
  });
});
