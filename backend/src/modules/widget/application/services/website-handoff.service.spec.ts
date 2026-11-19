import { ConflictException } from '@nestjs/common';
import { WebsiteHandoffService } from './website-handoff.service';
import { pickNextMember } from '../../domain/services/website-chat';

const requestedAt = new Date('2026-11-01T10:00:00.000Z');

function setup(
  opts: { mode?: 'MANUAL' | 'AUTO'; online?: string[]; hoursOpen?: boolean; state?: string; took?: boolean; consent?: boolean; idleMin?: number; kind?: 'TEAM' | 'FREELANCER' } = {},
) {
  const session = {
    id: 's1',
    orgId: 'o1',
    state: opts.state ?? 'WAITING',
    visitorName: 'Ravi',
    assignedToId: null as string | null,
    acceptedAt: null,
    handoffRequestedAt: requestedAt,
    consentAt: opts.consent ? new Date() : null,
    contactId: opts.consent ? 'ct1' : null,
    updatedAt: new Date(Date.now() - (opts.idleMin ?? 0) * 60_000),
  };
  const events: { type: string; data?: unknown }[] = [];
  const chats = {
    workspaceKind: jest.fn(async () => opts.kind ?? 'TEAM'),
    startWaiting: jest.fn(async () => true),
    findSession: jest.fn(async () => session),
    settings: jest.fn(async () => ({
      handoffMode: opts.mode ?? 'MANUAL',
      acceptTimeoutSec: 120,
      waitTimeoutMin: 5,
      handoffMessage: 'Someone from our team will reply here shortly.',
      afterHoursMessage: "We're closed now.",
      hoursEnabled: opts.hoursOpen === false,
      openMinute: 0,
      closeMinute: 1, // closed almost all day when hours are on
      openDays: [],
    })),
    timezone: jest.fn(async () => 'UTC'),
    teamMembers: jest.fn(async () => [
      { id: 'u1', firstName: 'Priya', lastName: '', role: 'EMPLOYEE' },
      { id: 'u2', firstName: 'Arun', lastName: '', role: 'EMPLOYEE' },
    ]),
    member: jest.fn(async (id: string) => ({ id, firstName: id === 'u1' ? 'Priya' : 'Arun', lastName: '', role: 'EMPLOYEE' })),
    createOffer: jest.fn(async (_o: string, _s: string, userId: string) => ({ id: `of-${userId}` })),
    findOffer: jest.fn(async () => ({ id: 'of-u1', orgId: 'o1', sessionId: 's1', userId: 'u1' })),
    findOpenOffer: jest.fn(async () => ({ id: 'of-u1' })),
    closeOffer: jest.fn(async () => true),
    cancelOpenOffers: jest.fn(async () => ['u2']),
    countOpenOffers: jest.fn(async () => 0),
    offeredUserIds: jest.fn(async () => new Set<string>()),
    candidates: jest.fn(async (_o: string, ids: string[]) => ids.map((userId) => ({ userId, openChats: userId === 'u1' ? 2 : 0, lastAcceptedAt: null }))),
    takeChat: jest.fn(async () => opts.took ?? true),
    end: jest.fn(async () => true),
    claimWelcome: jest.fn(async () => !!opts.consent),
    addEvent: jest.fn(async (_o: string, _s: string, type: string, _a: unknown, data?: unknown) => {
      events.push({ type, data });
      return {};
    }),
  };
  const widgets = {
    addMessage: jest.fn(async (_s: string, _o: string, _sender: string, body: string) => ({ id: 'm1', body, createdAt: new Date() })),
    touch: jest.fn(async () => undefined),
  };
  const notifications = { dispatch: jest.fn(async () => undefined) };
  const online = new Set(opts.online ?? ['u1', 'u2']);
  const gateway = { isUserOnline: jest.fn((id: string) => online.has(id)), emitToUser: jest.fn(), emitToOrg: jest.fn() };
  const queue = { publishDelayed: jest.fn(async () => 'job1'), publishOnce: jest.fn(async () => 'job2') };
  const audit = { log: jest.fn(async () => undefined) };
  const leads = { releaseWelcome: jest.fn(async () => true) };
  const service = new WebsiteHandoffService(
    chats as never,
    widgets as never,
    notifications as never,
    gateway as never,
    queue as never,
    audit as never,
    leads as never,
  );
  const types = () => events.map((e) => e.type);
  return { service, chats, widgets, notifications, gateway, queue, audit, leads, session, events, types };
}

describe('pickNextMember (auto-assign)', () => {
  it('fewest open chats first, then who waited longest, skipping members already asked', () => {
    const c = [
      { userId: 'a', openChats: 2, lastAcceptedAt: null },
      { userId: 'b', openChats: 0, lastAcceptedAt: new Date('2026-11-01T09:00:00Z') },
      { userId: 'c', openChats: 0, lastAcceptedAt: new Date('2026-11-01T08:00:00Z') },
    ];
    expect(pickNextMember(c, new Set())).toBe('c');
    expect(pickNextMember(c, new Set(['c']))).toBe('b');
    expect(pickNextMember(c, new Set(['a', 'b', 'c']))).toBeNull();
  });
});

describe('WebsiteHandoffService', () => {
  it('manual mode: every online member gets an offer and an alert; the visitor gets the handoff message; a wait check is queued', async () => {
    const { service, chats, notifications, queue, widgets, types } = setup();
    const out = await service.request('o1', 's1', 'ASKED_FOR_PERSON');
    expect(out).toMatchObject({ state: 'WAITING', offerFollowUp: false });
    expect(out.message?.body).toContain('reply here shortly');
    expect(chats.createOffer).toHaveBeenCalledTimes(2);
    expect(notifications.dispatch).toHaveBeenCalledTimes(2);
    expect(notifications.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'WEBSITE_HANDOFF', priority: 'HIGH' }));
    expect(queue.publishDelayed).toHaveBeenCalledWith('widget-wait-timeout', expect.objectContaining({ requestedAt: requestedAt.toISOString() }), 300);
    expect(widgets.addMessage).toHaveBeenCalledWith('s1', 'o1', 'bot', expect.any(String));
    expect(types()).toEqual(['HANDOFF_REQUESTED', 'OFFERED', 'TEAM_NOTIFIED']);
  });

  it('nobody online: everyone is still alerted, the visitor is offered a WhatsApp/email follow-up, all on the timeline', async () => {
    const { service, chats, notifications, types } = setup({ online: [] });
    const out = await service.request('o1', 's1', 'BUTTON');
    expect(out).toMatchObject({ state: 'WAITING', offerFollowUp: true });
    expect(chats.createOffer).not.toHaveBeenCalled();
    expect(notifications.dispatch).toHaveBeenCalledTimes(2);
    expect(types()).toEqual(['HANDOFF_REQUESTED', 'NO_ONE_AVAILABLE', 'TEAM_NOTIFIED', 'FOLLOW_UP_OFFERED']);
  });

  it('a freelancer is one person: the "our team is busy" line reads in first person; a team keeps it', async () => {
    const solo = setup({ online: [], kind: 'FREELANCER' });
    await solo.service.request('o1', 's1', 'BUTTON');
    expect(solo.widgets.addMessage).toHaveBeenCalledWith(
      's1', 'o1', 'bot', "Sorry, I can't reply right now. Shall I contact you on WhatsApp or email?",
    );

    const team = setup({ online: [] });
    await team.service.request('o1', 's1', 'BUTTON');
    expect(team.widgets.addMessage).toHaveBeenCalledWith(
      's1', 'o1', 'bot', 'Sorry, everyone on our team is busy right now. Shall we contact you on WhatsApp or email?',
    );
  });

  it('after hours: the after-hours message is sent and the follow-up is offered', async () => {
    const { service, events } = setup({ hoursOpen: false });
    const out = await service.request('o1', 's1', 'ASKED_FOR_PERSON');
    expect(out.message?.body).toBe("We're closed now.");
    expect(out.offerFollowUp).toBe(true);
    expect(events.find((e) => e.type === 'NO_ONE_AVAILABLE')?.data).toMatchObject({ reason: 'AFTER_HOURS' });
  });

  it('asking again while already waiting does nothing new', async () => {
    const { service, chats, notifications } = setup();
    chats.startWaiting.mockResolvedValueOnce(false);
    await service.request('o1', 's1', 'ASKED_FOR_PERSON');
    expect(notifications.dispatch).not.toHaveBeenCalled();
  });

  it('auto mode: offers to the least busy online member with a timeout job', async () => {
    const { service, chats, queue, notifications } = setup({ mode: 'AUTO' });
    await service.request('o1', 's1', 'ASKED_FOR_PERSON');
    expect(chats.createOffer).toHaveBeenCalledWith('o1', 's1', 'u2', expect.any(Date));
    expect(notifications.dispatch).toHaveBeenCalledTimes(1);
    expect(queue.publishDelayed).toHaveBeenCalledWith('widget-offer-timeout', { offerId: 'of-u2' }, 120);
  });

  it('accept: takes the chat, withdraws the other offers, tells the visitor who joined, logs and audits it', async () => {
    const { service, chats, gateway, widgets, audit, types } = setup();
    await service.accept('o1', 's1', 'u1');
    expect(chats.closeOffer).toHaveBeenCalledWith('of-u1', 'ACCEPTED');
    expect(gateway.emitToUser).toHaveBeenCalledWith('u2', 'website-chat:offer-closed', expect.objectContaining({ takenBy: 'Priya' }));
    expect(widgets.addMessage).toHaveBeenCalledWith('s1', 'o1', 'system', 'Priya joined the chat');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'WIDGET_CHAT_ACCEPTED', userId: 'u1' }));
    expect(types()).toContain('ACCEPTED');
  });

  it('two members accept at once: the second is told who has it', async () => {
    const { service, session } = setup({ took: false, state: 'PERSON' });
    session.assignedToId = 'u1';
    await expect(service.accept('o1', 's1', 'u2')).rejects.toThrow(new ConflictException('Priya already took this chat'));
  });

  it('decline in auto mode asks the next member', async () => {
    const { service, chats } = setup({ mode: 'AUTO' });
    chats.offeredUserIds.mockResolvedValue(new Set(['u2']));
    await service.decline('o1', 's1', 'u2');
    expect(chats.closeOffer).toHaveBeenCalledWith('of-u1', 'DECLINED');
    expect(chats.createOffer).toHaveBeenCalledWith('o1', 's1', 'u1', expect.any(Date));
  });

  it('everyone declined in manual mode: the visitor is offered the follow-up', async () => {
    const { service, types } = setup();
    await service.decline('o1', 's1', 'u1');
    expect(types()).toEqual(['DECLINED', 'NO_ONE_AVAILABLE', 'FOLLOW_UP_OFFERED']);
  });

  it('an offer that ran out is marked expired and the next member is asked; an answered one is left alone', async () => {
    const a = setup({ mode: 'AUTO' });
    a.chats.offeredUserIds.mockResolvedValue(new Set(['u1']));
    await a.service.onOfferTimeout({ offerId: 'of-u1' });
    expect(a.types()).toContain('OFFER_EXPIRED');
    expect(a.chats.createOffer).toHaveBeenCalledWith('o1', 's1', 'u2', expect.any(Date));

    const b = setup({ mode: 'AUTO' });
    b.chats.closeOffer.mockResolvedValue(false);
    await b.service.onOfferTimeout({ offerId: 'of-u1' });
    expect(b.chats.createOffer).not.toHaveBeenCalled();
  });

  it('wait check: offers the follow-up only for the request it belongs to', async () => {
    const a = setup();
    await a.service.onWaitTimeout({ orgId: 'o1', sessionId: 's1', requestedAt: requestedAt.toISOString() });
    expect(a.types()).toEqual(['NO_ONE_AVAILABLE', 'FOLLOW_UP_OFFERED']);

    const b = setup();
    await b.service.onWaitTimeout({ orgId: 'o1', sessionId: 's1', requestedAt: '2026-11-01T09:00:00.000Z' });
    expect(b.types()).toEqual([]);
  });

  it('a failed alert is written to the timeline instead of disappearing', async () => {
    const { service, notifications, events } = setup();
    notifications.dispatch.mockRejectedValueOnce(new Error('push down'));
    await service.request('o1', 's1', 'ASKED_FOR_PERSON');
    expect(events.find((e) => e.type === 'FAILED')?.data).toMatchObject({ step: 'notify:u1', error: 'push down' });
    expect(events.find((e) => e.type === 'TEAM_NOTIFIED')?.data).toMatchObject({ userIds: ['u2'] });
  });

  it('nobody online but the visitor agreed at the start: "we\'ll contact you on WhatsApp", the chat ends, the welcome goes', async () => {
    const { service, chats, leads, widgets, types } = setup({ online: [], consent: true });
    const out = await service.request('o1', 's1', 'ASKED_FOR_PERSON');
    expect(out).toMatchObject({ state: 'ENDED', offerFollowUp: false });
    expect(out.message?.body).toBe("Thank you! We'll contact you shortly on WhatsApp.");
    expect(chats.end).toHaveBeenCalledWith('s1', 'o1', 'UNAVAILABLE');
    expect(leads.releaseWelcome).toHaveBeenCalledWith('o1', 'ct1');
    expect(widgets.addMessage).toHaveBeenCalledWith('s1', 'o1', 'system', 'Chat ended');
    expect(types()).toEqual(['HANDOFF_REQUESTED', 'NO_ONE_AVAILABLE', 'TEAM_NOTIFIED', 'ENDED', 'WELCOME_TRIGGERED']);
  });

  it('ending a chat releases a pending welcome once; no pending welcome = nothing sent', async () => {
    const a = setup({ consent: true });
    await a.service.end('o1', 's1', { type: 'user', id: 'u1' }, 'MEMBER');
    expect(a.leads.releaseWelcome).toHaveBeenCalledTimes(1);
    expect(a.audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'WIDGET_CHAT_ENDED' }));

    const b = setup();
    await b.service.end('o1', 's1', { type: 'visitor' }, 'VISITOR');
    expect(b.leads.releaseWelcome).not.toHaveBeenCalled();
  });

  it('idle check: ends a chat quiet for 30 minutes; checks back later on an active one', async () => {
    const a = setup({ idleMin: 31, state: 'AI' });
    await a.service.onIdleCheck({ orgId: 'o1', sessionId: 's1' });
    expect(a.chats.end).toHaveBeenCalledWith('s1', 'o1', 'IDLE');

    const b = setup({ idleMin: 10, state: 'AI' });
    await b.service.onIdleCheck({ orgId: 'o1', sessionId: 's1' });
    expect(b.chats.end).not.toHaveBeenCalled();
    expect(b.queue.publishDelayed).toHaveBeenCalledWith('widget-idle-check', { orgId: 'o1', sessionId: 's1' }, expect.any(Number));
  });

  it("a timeline write that fails never breaks the visitor's chat", async () => {
    const { service, chats } = setup();
    chats.addEvent.mockRejectedValue(new Error('db busy'));
    await expect(service.request('o1', 's1', 'ASKED_FOR_PERSON')).resolves.toMatchObject({ state: 'WAITING' });
  });
});
