import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformAuditAction } from '@prisma/client';
import { UpdateAnnouncementUseCase } from './announcements.use-cases';

const actor = { id: 'sa-1', email: 'a@x.com' };
const announcement = {
  id: 'an-1',
  title: 'Maintenance',
  body: 'Tonight at 10',
  severity: 'INFO',
  targetType: 'ALL',
  targetPlanSlug: null,
  targetOrgId: null,
  startsAt: new Date('2026-10-10T00:00:00Z'),
  endsAt: null,
  dismissible: true,
  archivedAt: null as Date | null,
};

function setup(current: typeof announcement | null = announcement, orgExists = true) {
  const repo = {
    findById: jest.fn().mockResolvedValue(current),
    update: jest.fn().mockImplementation((_id, data) => Promise.resolve({ ...current, ...data })),
    orgExists: jest.fn().mockResolvedValue(orgExists),
    planSlugExists: jest.fn().mockResolvedValue(true),
  };
  const audit = { record: jest.fn() };
  return { repo, audit, uc: new UpdateAnnouncementUseCase(repo as any, audit as any) };
}

describe('UpdateAnnouncementUseCase', () => {
  it('updates only changed fields and audits a before/after diff', async () => {
    const s = setup();
    await s.uc.execute('an-1', { title: 'Maintenance', body: 'Tonight at 11' }, actor, {});
    expect(s.repo.update).toHaveBeenCalledWith('an-1', { body: 'Tonight at 11' });
    expect(s.audit.record.mock.calls[0][0]).toMatchObject({
      action: PlatformAuditAction.ANNOUNCEMENT_UPDATED,
      metadata: { before: { body: 'Tonight at 10' }, after: { body: 'Tonight at 11' } },
    });
  });

  it('does nothing when nothing changed', async () => {
    const s = setup();
    await s.uc.execute('an-1', { title: 'Maintenance' }, actor, {});
    expect(s.repo.update).not.toHaveBeenCalled();
    expect(s.audit.record).not.toHaveBeenCalled();
  });

  it('refuses archived announcements', async () => {
    const s = setup({ ...announcement, archivedAt: new Date() });
    await expect(s.uc.execute('an-1', { title: 'New title' }, actor, {})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s for an unknown announcement', async () => {
    const s = setup(null);
    await expect(s.uc.execute('x', { title: 'New title' }, actor, {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('needs an org id when retargeting to an org, and checks it exists', async () => {
    await expect(setup().uc.execute('an-1', { targetType: 'ORG' } as any, actor, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const s = setup(announcement, false);
    await expect(
      s.uc.execute('an-1', { targetType: 'ORG', targetOrgId: '00000000-0000-0000-0000-000000000001' } as any, actor, {}),
    ).rejects.toThrow('Organization not found');
  });

  it('rejects an end before the start', async () => {
    const s = setup();
    await expect(s.uc.execute('an-1', { endsAt: '2026-10-09T00:00:00Z' }, actor, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
