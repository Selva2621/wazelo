// Baileys ships ESM that Jest can't parse; the use case only needs the class as a type
jest.mock('@/infrastructure/external/whatsapp/baileys-connection-manager.service', () => ({
  BaileysConnectionManager: class {},
}));

import { WhatsAppCheckRunUseCase, WaCheckState } from './whatsapp-check-run.use-case';
import { WhatsAppCheckThrottleService } from '../../domain/services/whatsapp-check-throttle.service';
import { QUEUE_NAMES } from '@/common/constants';

const RUN_ID = 'run-1';
const TOKEN = 'tok-1';
const running: WaCheckState = { state: 'running', token: TOKEN, startedAt: '2026-10-12T00:00:00.000Z' };

function setup(opts: { waCheck?: WaCheckState | null; next?: { id: string; phone: string } | null; prior?: boolean | null } = {}) {
  const prisma = {
    scrapeRun: {
      findUnique: jest.fn().mockResolvedValue({ id: RUN_ID, orgId: 'org-1', waCheck: opts.waCheck === undefined ? running : opts.waCheck }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    scrapeResult: {
      findFirst: jest
        .fn()
        // 1st call: next result to check; 2nd call: prior answer from earlier runs
        .mockResolvedValueOnce(opts.next === undefined ? { id: 'res-1', phone: '+919000000001' } : opts.next)
        .mockResolvedValueOnce(opts.prior == null ? null : { waExists: opts.prior }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const queue = { publish: jest.fn(), publishDelayed: jest.fn() };
  const sessionRepo = { findAnyActiveByOrgId: jest.fn().mockResolvedValue({ id: 'sess-1' }) };
  const baileys = { checkWhatsApp: jest.fn().mockResolvedValue(true) };
  const throttle = new WhatsAppCheckThrottleService();
  const useCase = new WhatsAppCheckRunUseCase(prisma as never, queue as never, sessionRepo as never, baileys as never, throttle);
  return { useCase, prisma, queue, sessionRepo, baileys, throttle };
}

const finishedState = (prisma: ReturnType<typeof setup>['prisma']) =>
  (prisma.scrapeRun.updateMany.mock.calls[0]?.[0]?.data?.waCheck as WaCheckState | undefined)?.state;

describe('WhatsAppCheckRunUseCase.step', () => {
  it('ignores a job from a stale chain', async () => {
    const { useCase, prisma, baileys } = setup({ waCheck: { ...running, token: 'other' } });
    await useCase.step({ scrapeRunId: RUN_ID, token: TOKEN });
    expect(prisma.scrapeResult.findFirst).not.toHaveBeenCalled();
    expect(baileys.checkWhatsApp).not.toHaveBeenCalled();
  });

  it('finishes as done when nothing is left to check', async () => {
    const { useCase, prisma, queue } = setup({ next: null });
    await useCase.step({ scrapeRunId: RUN_ID, token: TOKEN });
    expect(finishedState(prisma)).toBe('done');
    expect(queue.publish).not.toHaveBeenCalled();
  });

  it('looks up a number, saves it and queues the next lookup with a gap', async () => {
    const { useCase, prisma, queue, baileys } = setup();
    await useCase.step({ scrapeRunId: RUN_ID, token: TOKEN });
    expect(baileys.checkWhatsApp).toHaveBeenCalledWith('sess-1', '+919000000001');
    expect(prisma.scrapeResult.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'res-1' }, data: expect.objectContaining({ waExists: true }) }),
    );
    expect(queue.publishDelayed).toHaveBeenCalledWith(QUEUE_NAMES.SCRAPE_WA_CHECK, { scrapeRunId: RUN_ID, token: TOKEN }, 7);
  });

  it('reuses an answer from an earlier run without a WhatsApp lookup', async () => {
    const { useCase, prisma, queue, baileys } = setup({ prior: false });
    await useCase.step({ scrapeRunId: RUN_ID, token: TOKEN });
    expect(baileys.checkWhatsApp).not.toHaveBeenCalled();
    expect(prisma.scrapeResult.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ waExists: false }) }));
    expect(queue.publish).toHaveBeenCalled();
  });

  it('waits and retries when the per-minute cap is hit', async () => {
    const { useCase, queue, baileys, throttle } = setup();
    jest.spyOn(throttle, 'acquire').mockReturnValue('minute_limit');
    await useCase.step({ scrapeRunId: RUN_ID, token: TOKEN });
    expect(baileys.checkWhatsApp).not.toHaveBeenCalled();
    expect(queue.publishDelayed).toHaveBeenCalledWith(QUEUE_NAMES.SCRAPE_WA_CHECK, expect.anything(), 15);
  });

  it('pauses for the day when the daily cap is hit', async () => {
    const { useCase, prisma, queue, throttle } = setup();
    jest.spyOn(throttle, 'acquire').mockReturnValue('day_limit');
    await useCase.step({ scrapeRunId: RUN_ID, token: TOKEN });
    expect(finishedState(prisma)).toBe('day_limit');
    expect(queue.publishDelayed).not.toHaveBeenCalled();
  });

  it('stops when WhatsApp is disconnected', async () => {
    const { useCase, prisma, sessionRepo } = setup();
    sessionRepo.findAnyActiveByOrgId.mockResolvedValue(null);
    await useCase.step({ scrapeRunId: RUN_ID, token: TOKEN });
    expect(finishedState(prisma)).toBe('no_session');
  });
});
