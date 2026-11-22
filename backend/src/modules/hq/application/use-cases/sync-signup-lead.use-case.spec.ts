import { SubscriptionStatus } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { HQ_CUSTOMER_PIPELINE } from '../../domain/services/signup-lead';
import { SyncSignupLeadUseCase } from './sync-signup-lead.use-case';

const STAGES = HQ_CUSTOMER_PIPELINE.stages.map((s, i) => ({ id: `st-${i}`, name: s.name }));
const stageId = (name: string) => STAGES.find((s) => s.name === name)!.id;

function setup(over: {
  hqId?: string | null;
  signup?: Record<string, unknown> | null;
  sub?: { status: SubscriptionStatus; priceInCents: number } | null;
  created?: boolean;
  existingDeal?: { stageId: string } | null;
  linkedContact?: boolean;
  currentTags?: { id: string; name: string }[];
} = {}) {
  const signup =
    over.signup === null
      ? null
      : {
          id: 'u1',
          orgId: 'cust',
          firstName: 'Priya',
          lastName: 'S',
          email: 'priya@acme.io',
          phone: '+919876543210',
          whatsappOptInAt: new Date('2026-11-22T10:00:00Z'),
          superAdminId: null,
          organization: { name: 'Acme', isInternal: false },
          ...over.signup,
        };
  const sub = over.sub === undefined ? null : over.sub;
  const repo = {
    findHqId: jest.fn().mockResolvedValue(over.hqId === undefined ? 'hq' : over.hqId),
    findSignup: jest.fn().mockResolvedValue(signup),
    latestSubscription: jest.fn().mockResolvedValue(sub && { ...sub, plan: { name: 'Starter' } }),
    findTeamIds: jest.fn().mockResolvedValue(['a1', 'm1']),
    findContactForOrg: jest
      .fn()
      .mockResolvedValue(over.linkedContact === false ? null : { id: 'c1', name: 'Priya S', ownerId: 'o1', metadata: { wazeloOrgName: 'Acme' } }),
    linkContact: jest.fn(),
    updatePlan: jest.fn(),
    recordConsent: jest.fn(),
    ensureCustomerPipeline: jest.fn().mockResolvedValue({ id: 'p1', stages: STAGES }),
    findDeal: jest.fn().mockResolvedValue(over.existingDeal ? { id: 'd1', pipelineId: 'p1', status: 'OPEN', ...over.existingDeal } : null),
    findOrgType: jest.fn().mockResolvedValue('TEAM'),
    contactTagNames: jest.fn().mockResolvedValue(over.currentTags ?? []),
  };
  const contacts = {
    upsertByPhone: jest.fn().mockResolvedValue({ contact: { id: 'c1', ownerId: 'o1' }, created: over.created ?? true }),
    findOrCreateTag: jest.fn(async (_org: string, name: string) => ({ id: `tag-${name}` })),
    addTagToContact: jest.fn(),
    removeTagFromContact: jest.fn(),
  };
  const deals = { create: jest.fn().mockResolvedValue({ id: 'd1' }), moveToStage: jest.fn().mockResolvedValue({ id: 'd1' }) };
  const assignment = { assignOwner: jest.fn().mockResolvedValue('o1') };
  const notifications = { dispatchToOrg: jest.fn() };
  const events = { emit: jest.fn() };
  const uc = new SyncSignupLeadUseCase(repo as any, contacts as any, deals as any, assignment as any, notifications as any, events as any);
  return { uc, repo, contacts, deals, notifications, events };
}

describe('SyncSignupLeadUseCase.fromSignup', () => {
  it('new sign-up with consent: contact, consent, deal at "Signed up", team notified, welcome released', async () => {
    const t = setup();
    await t.uc.fromSignup('u1');

    expect(t.contacts.upsertByPhone).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: 'hq', phoneNumber: '+919876543210', source: 'SIGNUP', ownerId: 'o1' }),
      'o1',
    );
    expect(t.repo.linkContact).toHaveBeenCalledWith('c1', expect.objectContaining({ customerOrgId: 'cust', orgName: 'Acme' }), 'priya@acme.io');
    expect(t.repo.recordConsent).toHaveBeenCalled();
    expect(t.deals.create).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'hq', pipelineId: 'p1', stageId: stageId('Signed up'), title: 'Acme — Priya S' }));
    expect(t.notifications.dispatchToOrg).toHaveBeenCalledWith('hq', ['a1', 'm1'], 'LEAD_ASSIGNED', 'HIGH', 'New sign-up: Priya S', expect.any(String), expect.any(Object), 'hq-signup:cust');
    expect(t.events.emit).toHaveBeenCalledWith(EVENT_NAMES.CONTACT_CREATED, expect.objectContaining({ orgId: 'hq', contactId: 'c1', source: 'SIGNUP' }));
  });

  it('without WhatsApp consent: no consent record and no welcome, but still a lead', async () => {
    const t = setup({ signup: { whatsappOptInAt: null } });
    await t.uc.fromSignup('u1');
    expect(t.repo.recordConsent).not.toHaveBeenCalled();
    expect(t.events.emit).not.toHaveBeenCalled();
    expect(t.deals.create).toHaveBeenCalled();
    expect(t.notifications.dispatchToOrg).toHaveBeenCalled();
  });

  it('already an HQ contact: no second notification or welcome', async () => {
    const t = setup({ created: false, existingDeal: { stageId: stageId('Signed up') } });
    await t.uc.fromSignup('u1');
    expect(t.notifications.dispatchToOrg).not.toHaveBeenCalled();
    expect(t.events.emit).not.toHaveBeenCalled();
    expect(t.deals.create).not.toHaveBeenCalled();
  });

  it('a trial that started before the lead was made lands straight in "Trial"', async () => {
    const t = setup({ sub: { status: SubscriptionStatus.TRIAL, priceInCents: 0 } });
    await t.uc.fromSignup('u1');
    expect(t.deals.create).toHaveBeenCalledWith(expect.objectContaining({ stageId: stageId('Trial') }));
  });

  it('a trial assigned while the lead was being made: the deal is moved to "Trial" right after', async () => {
    const t = setup();
    t.repo.latestSubscription
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ status: SubscriptionStatus.TRIAL, priceInCents: 0, plan: { name: 'Free trial' } });
    t.repo.findDeal
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'd1', pipelineId: 'p1', stageId: stageId('Signed up'), status: 'OPEN' });
    await t.uc.fromSignup('u1');
    expect(t.deals.create).toHaveBeenCalledTimes(1);
    expect(t.deals.moveToStage).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1' }), stageId('Trial'));
    expect(t.repo.updatePlan).toHaveBeenCalledWith('c1', 'Free trial');
  });

  it.each([
    ['no HQ yet', { hqId: null }],
    ['no phone (Google sign-up before onboarding)', { signup: { phone: null } }],
    ["HQ's own super admin user", { signup: { superAdminId: 'sa1' } }],
    ['a user of HQ itself', { signup: { organization: { name: 'Wazelo HQ', isInternal: true } } }],
  ])('does nothing for %s', async (_label, over) => {
    const t = setup(over as any);
    await t.uc.fromSignup('u1');
    expect(t.contacts.upsertByPhone).not.toHaveBeenCalled();
    expect(t.deals.create).not.toHaveBeenCalled();
  });
});

describe('SyncSignupLeadUseCase.fromSubscription', () => {
  it('moves the deal to the stage of the current subscription', async () => {
    const t = setup({ sub: { status: SubscriptionStatus.ACTIVE, priceInCents: 99900 }, existingDeal: { stageId: stageId('Trial') } });
    await t.uc.fromSubscription('cust');
    expect(t.deals.moveToStage).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1' }), stageId('Paid'));
    expect(t.repo.updatePlan).toHaveBeenCalledWith('c1', 'Starter');
  });

  it('never creates a deal (only fromSignup does, so the two cannot race into duplicates)', async () => {
    const t = setup({ sub: { status: SubscriptionStatus.TRIAL, priceInCents: 0 }, existingDeal: null });
    await t.uc.fromSubscription('cust');
    expect(t.deals.create).not.toHaveBeenCalled();
  });

  it('cancelled → Churned', async () => {
    const t = setup({ sub: { status: SubscriptionStatus.CANCELLED, priceInCents: 99900 }, existingDeal: { stageId: stageId('Paid') } });
    await t.uc.fromSubscription('cust');
    expect(t.deals.moveToStage).toHaveBeenCalledWith(expect.anything(), stageId('Churned'));
  });

  it('already in the right stage: no move (replayed event)', async () => {
    const t = setup({ sub: { status: SubscriptionStatus.TRIAL, priceInCents: 0 }, existingDeal: { stageId: stageId('Trial') } });
    await t.uc.fromSubscription('cust');
    expect(t.deals.moveToStage).not.toHaveBeenCalled();
    expect(t.deals.create).not.toHaveBeenCalled();
  });

  it('no HQ contact for that org yet: nothing to move', async () => {
    const t = setup({ linkedContact: false, sub: { status: SubscriptionStatus.TRIAL, priceInCents: 0 } });
    await t.uc.fromSubscription('cust');
    expect(t.deals.create).not.toHaveBeenCalled();
    expect(t.deals.moveToStage).not.toHaveBeenCalled();
  });

  it('keeps segment tags in step: adds the new stage/plan tags, drops the stale ones, leaves other tags', async () => {
    const t = setup({
      sub: { status: SubscriptionStatus.ACTIVE, priceInCents: 99900 },
      existingDeal: { stageId: stageId('Trial') },
      currentTags: [
        { id: 'x1', name: 'stage:trial' },
        { id: 'x2', name: 'plan:free-trial' },
        { id: 'x3', name: 'type:team' },
        { id: 'x4', name: 'vip' },
      ],
    });
    await t.uc.fromSubscription('cust');
    const added = t.contacts.findOrCreateTag.mock.calls.map((c) => c[1]);
    expect(added.sort()).toEqual(['plan:starter', 'stage:paid']);
    expect(t.contacts.removeTagFromContact.mock.calls.map((c) => c[1]).sort()).toEqual(['x1', 'x2']);
  });

  it("ignores HQ's own subscription", async () => {
    const t = setup();
    await t.uc.fromSubscription('hq');
    expect(t.repo.findContactForOrg).not.toHaveBeenCalled();
  });
});
