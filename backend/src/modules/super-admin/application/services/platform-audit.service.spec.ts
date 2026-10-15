import { Logger } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { PlatformAuditService } from './platform-audit.service';

const entry = {
  action: PlatformAuditAction.ORG_SUSPENDED,
  actor: { id: 'admin-1', email: 'a@x.com' },
  targetType: 'Organization',
  targetId: 'org-1',
};

describe('PlatformAuditService', () => {
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  it('writes once when the database is fine', async () => {
    const repo = { create: jest.fn().mockResolvedValue(undefined) };
    const svc = new PlatformAuditService(repo as any);
    await svc.record(entry);
    expect(repo.create).toHaveBeenCalledTimes(1);
    expect(svc.pendingCount()).toBe(0);
  });

  it('retries inline and succeeds on a transient failure', async () => {
    const repo = { create: jest.fn().mockRejectedValueOnce(new Error('blip')).mockResolvedValue(undefined) };
    const svc = new PlatformAuditService(repo as any);
    await svc.record(entry);
    expect(repo.create).toHaveBeenCalledTimes(2);
    expect(svc.pendingCount()).toBe(0);
  });

  it('never throws to the caller; parks the entry and writes it later with its original time', async () => {
    let down = true;
    const repo = {
      create: jest.fn(async () => {
        if (down) throw new Error('db down');
      }),
    };
    const svc = new PlatformAuditService(repo as any);

    await expect(svc.record(entry)).resolves.toBeUndefined();
    expect(repo.create).toHaveBeenCalledTimes(3);
    expect(svc.pendingCount()).toBe(1);
    const originalTime = (repo.create.mock.calls[0] as any[])[0].createdAt as Date;

    await svc.flushPending(); // still down
    expect(svc.pendingCount()).toBe(1);

    down = false;
    await svc.flushPending();
    expect(svc.pendingCount()).toBe(0);
    const written = (repo.create.mock.calls.at(-1) as any[])[0];
    expect(written.createdAt).toBe(originalTime);
    expect(written).toMatchObject({ action: entry.action, targetId: 'org-1', actorId: 'admin-1' });
  });

  it('flushes parked entries on shutdown', async () => {
    let down = true;
    const repo = { create: jest.fn(async () => { if (down) throw new Error('db down'); }) };
    const svc = new PlatformAuditService(repo as any);
    await svc.record(entry);
    down = false;
    await svc.onApplicationShutdown();
    expect(svc.pendingCount()).toBe(0);
  });
});
