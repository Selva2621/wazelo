import { BadRequestException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgStatusService } from '../../domain/services/org-status.service';
import { NotWazeloHqGuard } from './not-wazelo-hq.guard';

function ctx(req: any) {
  return { getHandler: () => () => undefined, switchToHttp: () => ({ getRequest: () => req }) } as any;
}

function orgStatus(internalIds: string[]) {
  const prisma = {
    organization: {
      findUnique: jest.fn(async ({ where }: any) => ({ isInternal: internalIds.includes(where.id) })),
    },
  };
  return { service: new OrgStatusService(prisma as any), prisma };
}

function guard(meta: { action: string; org: 'param' | 'self' } | undefined, service: OrgStatusService) {
  const reflector = { get: jest.fn().mockReturnValue(meta) } as unknown as Reflector;
  return new NotWazeloHqGuard(reflector, service);
}

describe('NotWazeloHqGuard', () => {
  it('blocks a super admin action on HQ (org from :id)', async () => {
    const { service } = orgStatus(['hq']);
    await expect(guard({ action: 'suspend', org: 'param' }, service).canActivate(ctx({ params: { id: 'hq' } }))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('lets the same action through for any other org', async () => {
    const { service } = orgStatus(['hq']);
    await expect(guard({ action: 'suspend', org: 'param' }, service).canActivate(ctx({ params: { id: 'acme' } }))).resolves.toBe(true);
  });

  it("tenant routes check the caller's own org", async () => {
    const { service } = orgStatus(['hq']);
    const g = guard({ action: 'cancel the subscription of', org: 'self' }, service);
    await expect(g.canActivate(ctx({ user: { orgId: 'hq' }, params: {} }))).rejects.toThrow(BadRequestException);
    await expect(g.canActivate(ctx({ user: { orgId: 'acme' }, params: { id: 'hq' } }))).resolves.toBe(true);
  });

  it('does nothing on routes without @HqProtected', async () => {
    const { service, prisma } = orgStatus(['hq']);
    await expect(guard(undefined, service).canActivate(ctx({ params: { id: 'hq' } }))).resolves.toBe(true);
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it('caches the internal flag (it never changes)', async () => {
    const { service, prisma } = orgStatus(['hq']);
    await service.isInternal('acme');
    await service.isInternal('acme');
    expect(prisma.organization.findUnique).toHaveBeenCalledTimes(1);
  });
});
