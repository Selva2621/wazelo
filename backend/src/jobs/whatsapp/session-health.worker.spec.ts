import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { WhatsAppSessionService } from '@/modules/whatsapp/domain/services/session.service';
import { BaileysConnectionManager } from '@/infrastructure/external/whatsapp/baileys-connection-manager.service';
import { QueueService } from '@/infrastructure/queue/queue.service';

jest.mock('@/infrastructure/external/whatsapp/baileys-connection-manager.service', () => ({
  BaileysConnectionManager: class BaileysConnectionManager {},
}));

import { SessionHealthWorker } from './session-health.worker';

describe('SessionHealthWorker', () => {
  const session = {
    id: 'session-1',
    orgId: 'org-1',
    userId: 'user-1',
    status: 'RECONNECTING',
    reconnectCount: 1,
  };

  async function runHealthCheck(isConnected: boolean) {
    let processJob:
      | ((job: { data: { sessionId: string; action: 'check' }; id: string }) => Promise<void>)
      | undefined;
    const queue = {
      subscribe: jest.fn(async (_name, handler) => {
        processJob = handler;
      }),
      publish: jest.fn(),
    } as unknown as QueueService;
    const repository = {
      findById: jest.fn().mockResolvedValue(session),
      markConnectedFromHealthCheck: jest.fn(),
      updateHeartbeat: jest.fn(),
      incrementReconnectCount: jest.fn(),
    } as unknown as WhatsAppSessionRepository;
    const connectionManager = {
      isConnected: jest.fn().mockReturnValue(isConnected),
    } as unknown as BaileysConnectionManager;
    const sessionService = {
      canRetryReconnect: jest.fn().mockReturnValue(true),
      getReconnectDelayMs: jest.fn().mockReturnValue(5000),
    } as unknown as WhatsAppSessionService;
    const worker = new SessionHealthWorker(
      queue,
      repository,
      connectionManager,
      sessionService,
      {} as AuditService,
      {} as EventEmitter2,
    );

    await worker.onModuleInit();
    await processJob?.({ data: { sessionId: session.id, action: 'check' }, id: 'job-1' });

    return { queue, repository };
  }

  it('restores CONNECTED when the live socket contradicts a stale RECONNECTING status', async () => {
    const { repository } = await runHealthCheck(true);

    expect(repository.markConnectedFromHealthCheck).toHaveBeenCalledWith(session.id);
    expect(repository.updateHeartbeat).not.toHaveBeenCalled();
  });

  it('does not start another retry sequence while a disconnected session is already reconnecting', async () => {
    const { queue, repository } = await runHealthCheck(false);

    expect(repository.incrementReconnectCount).not.toHaveBeenCalled();
    expect(queue.publish).not.toHaveBeenCalled();
  });
});
