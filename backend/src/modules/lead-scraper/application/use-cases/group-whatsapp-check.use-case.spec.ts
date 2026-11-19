// Baileys is ESM-only; the manager is injected as a mock anyway
jest.mock('@/infrastructure/external/whatsapp/baileys-connection-manager.service', () => ({
  BaileysConnectionManager: class {},
}));
import { QUEUE_NAMES } from '@/common/constants';
import { contactsToCheckWhere, GroupWhatsAppCheckUseCase } from './group-whatsapp-check.use-case';

const running = { state: 'running', token: 't1', startedAt: '2026-11-07T10:00:00.000Z' };

function setup(overrides: { contact?: unknown; slot?: string; cached?: boolean; exists?: boolean | null } = {}) {
  const prisma = {
    savedContactGroup: {
      findUnique: jest.fn().mockResolvedValue({ id: 'g1', orgId: 'o1', deletedAt: null, waCheck: running }),
      findFirst: jest.fn().mockResolvedValue({ id: 'g1', waCheck: null }),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    contact: {
      findFirst: jest.fn().mockResolvedValue(
        'contact' in overrides ? overrides.contact : { id: 'c1', phoneNumber: '+919800000001' },
      ),
      update: jest.fn(),
    },
    scrapeResult: { findFirst: jest.fn().mockResolvedValue(null) },
  };
  const queue = { publish: jest.fn(), publishDelayed: jest.fn() };
  const sessions = { findAnyActiveByOrgId: jest.fn().mockResolvedValue({ id: 's1' }) };
  const baileys = { checkWhatsApp: jest.fn().mockResolvedValue(overrides.exists ?? true) };
  const throttle = {
    getCached: jest.fn().mockReturnValue(overrides.cached),
    acquire: jest.fn().mockReturnValue(overrides.slot ?? 'ok'),
    remember: jest.fn(),
  };
  const useCase = new GroupWhatsAppCheckUseCase(
    prisma as never, queue as never, sessions as never, baileys as never, throttle as never,
  );
  return { useCase, prisma, queue, baileys, throttle };
}

describe('GroupWhatsAppCheckUseCase', () => {
  it('checks the next member, stores the answer on the contact and queues the next lookup', async () => {
    const { useCase, prisma, queue, baileys } = setup({ exists: false });

    await useCase.step({ groupId: 'g1', token: 't1' });

    expect(baileys.checkWhatsApp).toHaveBeenCalledWith('s1', '+919800000001');
    expect(prisma.contact.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { waExists: false, waCheckedAt: expect.any(Date) },
    });
    expect(queue.publishDelayed).toHaveBeenCalledWith(QUEUE_NAMES.GROUP_WA_CHECK, { groupId: 'g1', token: 't1' }, 7);
  });

  it('reuses a cached answer without a WhatsApp lookup', async () => {
    const { useCase, baileys, queue } = setup({ cached: true });
    await useCase.step({ groupId: 'g1', token: 't1' });
    expect(baileys.checkWhatsApp).not.toHaveBeenCalled();
    expect(queue.publish).toHaveBeenCalledWith(QUEUE_NAMES.GROUP_WA_CHECK, { groupId: 'g1', token: 't1' });
  });

  it('stops for the day when the per-number lookup cap is used up', async () => {
    const { useCase, prisma, baileys } = setup({ slot: 'day_limit' });
    await useCase.step({ groupId: 'g1', token: 't1' });
    expect(baileys.checkWhatsApp).not.toHaveBeenCalled();
    expect(prisma.savedContactGroup.updateMany.mock.calls[0][0].data.waCheck.state).toBe('day_limit');
  });

  it('finishes when every member has an answer', async () => {
    const { useCase, prisma } = setup({ contact: null });
    await useCase.step({ groupId: 'g1', token: 't1' });
    expect(prisma.savedContactGroup.updateMany.mock.calls[0][0].data.waCheck.state).toBe('done');
  });

  it('ignores a job from an older run', async () => {
    const { useCase, prisma } = setup();
    await useCase.step({ groupId: 'g1', token: 'old-token' });
    expect(prisma.contact.findFirst).not.toHaveBeenCalled();
  });

  it('only picks members that need a (re)check and were not tried in this run', () => {
    const where = contactsToCheckWhere('g1', 'o1', new Date(running.startedAt));
    expect(where.savedGroupMemberships).toEqual({ some: { groupId: 'g1' } });
    expect(where.AND).toEqual([
      { OR: [{ waCheckedAt: null }, { waExists: null }, { waCheckedAt: { lt: expect.any(Date) } }] },
      { OR: [{ waCheckedAt: null }, { waCheckedAt: { lt: new Date(running.startedAt) } }] },
    ]);
  });
});
