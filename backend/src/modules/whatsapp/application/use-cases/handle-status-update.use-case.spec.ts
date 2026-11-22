import { MessageStatus } from '@prisma/client';
import { HandleStatusUpdateUseCase, UNKNOWN_MESSAGE_RETRY_MS } from './handle-status-update.use-case';

const MSG = { id: 'm1', orgId: 'o1', sessionId: 's1', status: MessageStatus.SENT, retryCount: 0, contactPhone: '+1' };

function setup(found: Array<typeof MSG | null>) {
  const messageRepo = {
    findByWhatsAppMessageId: jest.fn(),
    updateStatus: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn(),
  };
  for (const f of found) messageRepo.findByWhatsAppMessageId.mockResolvedValueOnce(f);
  messageRepo.findByWhatsAppMessageId.mockResolvedValue(null);
  const events = { record: jest.fn().mockResolvedValue(undefined) };
  const emitter = { emit: jest.fn() };
  const uc = new HandleStatusUpdateUseCase(messageRepo as any, events as any, emitter as any);
  return { uc, messageRepo, emitter };
}

const delivered = { whatsappMessageId: 'wa1', status: 'delivered' as const, timestamp: 1 };

/** Let the timer fire and the retried lookup settle */
async function tick(ms: number) {
  jest.advanceTimersByTime(ms);
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe('HandleStatusUpdateUseCase', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('applies a known message status straight away', async () => {
    const t = setup([MSG]);
    await t.uc.execute(delivered);
    expect(t.messageRepo.updateStatus).toHaveBeenCalledWith('m1', MessageStatus.DELIVERED);
  });

  it('a receipt that beats the send worker is applied once the id is saved', async () => {
    const t = setup([null, null, MSG]);
    await t.uc.execute(delivered);
    expect(t.messageRepo.updateStatus).not.toHaveBeenCalled();

    await tick(UNKNOWN_MESSAGE_RETRY_MS[0]);
    expect(t.messageRepo.updateStatus).not.toHaveBeenCalled();
    await tick(UNKNOWN_MESSAGE_RETRY_MS[1]);
    expect(t.messageRepo.updateStatus).toHaveBeenCalledWith('m1', MessageStatus.DELIVERED);
    expect(t.emitter.emit).toHaveBeenCalledTimes(1);
  });

  it('gives up after the last retry', async () => {
    const t = setup([]);
    await t.uc.execute(delivered);
    for (const ms of UNKNOWN_MESSAGE_RETRY_MS) await tick(ms);
    await tick(60_000);
    expect(t.messageRepo.findByWhatsAppMessageId).toHaveBeenCalledTimes(UNKNOWN_MESSAGE_RETRY_MS.length + 1);
    expect(t.messageRepo.updateStatus).not.toHaveBeenCalled();
  });
});
