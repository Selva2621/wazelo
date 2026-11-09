import { AutomationActionType } from '@prisma/client';
import { ActionExecutorService } from './action-executor.service';
import { CAMPAIGN_CONFIG } from '@/common/constants';

const baseContact = {
  phoneNumber: '+919000000001',
  name: null,
  email: null,
  leadStatus: 'NEW',
  sessionId: 'contact-session',
  optedOut: false,
  deletedAt: null,
  mergedIntoId: null,
};

function setup(contact: Record<string, unknown> | null = baseContact) {
  const prisma = {
    contact: { findFirst: jest.fn(async () => contact) },
    automationRule: { findFirst: jest.fn(async () => ({ createdById: 'creator' })) },
    tag: { findFirst: jest.fn(async () => ({ name: 'vip' })) },
    sequenceRecipient: { findMany: jest.fn(async () => [{ id: 'sr1', sequenceId: 'seq1' }, { id: 'sr2', sequenceId: 'seq2' }]) },
    user: { findFirst: jest.fn(async () => ({ id: 'u2' })) },
    conversation: { findFirst: jest.fn(async () => ({ id: 'conv1' })) },
    product: { findFirst: jest.fn(async (): Promise<{ id: string; name: string } | null> => ({ id: 'p1', name: 'Villa plots' })) },
    contactProduct: {
      findUnique: jest.fn(async (): Promise<{ id: string } | null> => null),
      create: jest.fn(async () => ({ id: 'cp1' })),
    },
  };
  const sequenceRepo = { exitRecipient: jest.fn(async () => ({})), updateSequenceCounters: jest.fn(async () => ({})) };
  const events = { emit: jest.fn() };
  const assignContact = { execute: jest.fn(async () => ({})) };
  const addTag = { execute: jest.fn(async () => ({})) };
  const changeLeadStatus = { execute: jest.fn(async () => ({})) };
  const queueService = { publishOnce: jest.fn(async () => 'job') };
  const messageRepo = {
    findByIdempotencyKey: jest.fn(async () => null),
    create: jest.fn(async (data: Record<string, unknown>) => ({ id: 'm1', ...data })),
  };
  const conversationRepo = { findOrCreate: jest.fn(async () => ({ id: 'c1' })), assignTo: jest.fn(async () => ({})) };
  const messageEventRepo = { record: jest.fn(async () => undefined) };
  const sessionRepo = { findAnyActiveByOrgId: jest.fn(async () => ({ id: 'any-session' })) };
  const orgEmail = { queue: jest.fn(async (): Promise<Record<string, unknown>> => ({ emailMessageId: 'em1', status: 'QUEUED' })) };
  const service = new ActionExecutorService(
    queueService as never,
    prisma as never,
    messageRepo as never,
    conversationRepo as never,
    messageEventRepo as never,
    sessionRepo as never,
    {} as never,
    assignContact as never,
    addTag as never,
    changeLeadStatus as never,
    sequenceRepo as never,
    events as never,
    orgEmail as never,
  );
  return { service, messageRepo, queueService, assignContact, addTag, changeLeadStatus, sequenceRepo, events, conversationRepo, prisma, orgEmail };
}

const send = (eventPayload?: Record<string, unknown>) => ({
  orgId: 'o1',
  contactId: 'ct1',
  actionType: AutomationActionType.SEND_MESSAGE,
  actionConfig: { messageBody: 'Hi {{contact.name}}! {{ name }}' },
  executionId: 'e1',
  ruleId: 'r1',
  eventPayload,
});

describe('ActionExecutorService contact actions (run now, as the rule creator)', () => {
  const action = (actionType: AutomationActionType, actionConfig: Record<string, unknown>) => ({
    orgId: 'o1', contactId: 'ct1', actionType, actionConfig, executionId: 'e1', ruleId: 'r1',
  });

  it('assigns the contact', async () => {
    const { service, assignContact } = setup();
    const r = await service.execute(action(AutomationActionType.ASSIGN_CONTACT, { assignToUserId: 'u2' }));
    expect(r.success).toBe(true);
    expect(assignContact.execute).toHaveBeenCalledWith('ct1', 'o1', 'creator', expect.objectContaining({ ownerId: 'u2' }));
  });

  it('adds a tag by name, or looks the name up from an old tag id', async () => {
    const { service, addTag } = setup();
    await service.execute(action(AutomationActionType.ADD_TAG, { tagName: 'qualified-lead' }));
    await service.execute(action(AutomationActionType.ADD_TAG, { tagId: 't1' }));
    expect(addTag.execute).toHaveBeenNthCalledWith(1, 'ct1', 'o1', 'creator', { name: 'qualified-lead' });
    expect(addTag.execute).toHaveBeenNthCalledWith(2, 'ct1', 'o1', 'creator', { name: 'vip' });
  });

  it('adds the contact to a product once, keeping their other products', async () => {
    const { service, prisma, events } = setup();
    const r = await service.execute(action(AutomationActionType.ADD_TO_PRODUCT, { productId: 'p1' }));
    expect(r).toMatchObject({ success: true, result: { productName: 'Villa plots', alreadyLinked: false } });
    expect(prisma.product.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1', orgId: 'o1', deletedAt: null } }));
    expect(prisma.contactProduct.create).toHaveBeenCalledWith({ data: { contactId: 'ct1', productId: 'p1', orgId: 'o1' } });
    expect(events.emit).toHaveBeenCalledWith('product.contact_assigned', { contactId: 'ct1', productId: 'p1', orgId: 'o1' });

    prisma.contactProduct.findUnique.mockResolvedValueOnce({ id: 'cp1' });
    prisma.contactProduct.create.mockClear();
    const again = await service.execute(action(AutomationActionType.ADD_TO_PRODUCT, { productId: 'p1' }));
    expect(again).toMatchObject({ success: true, result: { alreadyLinked: true } });
    expect(prisma.contactProduct.create).not.toHaveBeenCalled();
  });

  it('fails on a missing or other-org product', async () => {
    const { service, prisma } = setup();
    expect((await service.execute(action(AutomationActionType.ADD_TO_PRODUCT, {}))).success).toBe(false);
    prisma.product.findFirst.mockResolvedValueOnce(null);
    expect(await service.execute(action(AutomationActionType.ADD_TO_PRODUCT, { productId: 'p9' }))).toMatchObject({
      success: false,
      error: 'Product not found',
    });
  });

  it('stops every running sequence for the contact (or just one when given)', async () => {
    const { service, sequenceRepo, prisma } = setup();
    const r = await service.execute(action(AutomationActionType.STOP_SEQUENCE, {}));
    expect(r.result).toEqual({ stopped: 2 });
    expect(sequenceRepo.exitRecipient).toHaveBeenCalledWith('sr1', 'Stopped by automation');
    await service.execute(action(AutomationActionType.STOP_SEQUENCE, { sequenceId: 'seq1' }));
    expect(prisma.sequenceRecipient.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ sequenceId: 'seq1' }) }),
    );
  });

  it('assigns the chat to a person, which pauses the bots there', async () => {
    const { service, conversationRepo, events } = setup();
    const r = await service.execute({
      ...action(AutomationActionType.ASSIGN_CONVERSATION, { assignToUserId: 'u2' }),
      eventPayload: { conversationId: 'conv1' },
    });
    expect(r.success).toBe(true);
    expect(conversationRepo.assignTo).toHaveBeenCalledWith('conv1', 'u2');
    expect(events.emit).toHaveBeenCalledWith(
      'conversation.assigned',
      expect.objectContaining({ conversationId: 'conv1', assignedToId: 'u2' }),
    );
  });

  it('changes the lead status, and rejects an unknown one', async () => {
    const { service, changeLeadStatus } = setup();
    expect((await service.execute(action(AutomationActionType.UPDATE_STATUS, { newStatus: 'INTERESTED' }))).success).toBe(true);
    expect(changeLeadStatus.execute).toHaveBeenCalledWith('ct1', 'o1', 'creator', expect.objectContaining({ status: 'INTERESTED' }));
    expect((await service.execute(action(AutomationActionType.UPDATE_STATUS, { newStatus: 'NOPE' }))).success).toBe(false);
  });
});

describe('ActionExecutorService SEND_EMAIL', () => {
  const input = (actionConfig: Record<string, unknown>) => ({
    orgId: 'o1',
    contactId: 'ct1',
    actionType: AutomationActionType.SEND_EMAIL,
    actionConfig,
    executionId: 'ex1',
    ruleId: 'r1',
    eventPayload: { orderName: '#1001' },
  });

  it('queues the email from the workspace mailbox, once per run (idempotency key), with event fields filled', async () => {
    const { service, orgEmail } = setup();
    const r = await service.execute(input({ subject: 'Order {{shopify.order_name}}', body: 'Hi {{name}}, thanks!' }));
    expect(r).toMatchObject({ success: true, result: { emailMessageId: 'em1', status: 'QUEUED' } });
    expect(orgEmail.queue).toHaveBeenCalledWith(
      expect.objectContaining({
        contactId: 'ct1',
        subject: 'Order #1001',
        body: 'Hi {{name}}, thanks!',
        source: 'AUTOMATION',
        sourceId: 'r1',
        idempotencyKey: 'auto-email-ex1-r1-ct1',
      }),
    );
  });

  it("is skipped (not failed) when the email can't go, with the reason", async () => {
    const { service, orgEmail } = setup();
    orgEmail.queue.mockResolvedValueOnce({ emailMessageId: 'em2', status: 'SKIPPED', reason: 'Unsubscribed from email' });
    const r = await service.execute(input({ subject: 'Hi', body: 'Hello' }));
    expect(r).toMatchObject({ success: true, result: { skipped: true, reason: 'Unsubscribed from email' } });
  });

  it('fails without a subject or message', async () => {
    const { service, orgEmail } = setup();
    const r = await service.execute(input({ subject: '', body: 'Hello' }));
    expect(r.success).toBe(false);
    expect(orgEmail.queue).not.toHaveBeenCalled();
  });

  it('sends no second welcome email when a "Lead Ad Received" rule emails the lead', async () => {
    const { service, orgEmail } = setup();
    const r = await service.execute({ ...input({ subject: 'Hi', body: 'Hello' }), eventPayload: { emailByLeadAdRule: true } });
    expect(r).toMatchObject({ success: true, result: { skipped: true } });
    expect(orgEmail.queue).not.toHaveBeenCalled();
  });
});

describe('ActionExecutorService SEND_MESSAGE', () => {
  it('replies to an inbound message on the number the contact wrote to, in the direct lane', async () => {
    const { service, messageRepo } = setup();
    const result = await service.execute(send({ inbound: true, sessionId: 'inbound-session' }));
    expect(result.success).toBe(true);
    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'inbound-session', priority: 0, body: 'Hi there! there' }),
    );
  });

  it('sends messages we start through the bulk lane (hours, warm-up, opt-out re-check)', async () => {
    const { service, messageRepo, queueService } = setup();
    await service.execute(send({ contactId: 'ct1' }));
    expect(messageRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId: 'contact-session', priority: CAMPAIGN_CONFIG.CAMPAIGN_MESSAGE_PRIORITY }),
    );
    expect(queueService.publishOnce).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ priority: CAMPAIGN_CONFIG.CAMPAIGN_MESSAGE_PRIORITY }),
    );
  });

  it('skips opted-out contacts for messages we start, without failing the rule', async () => {
    const { service, messageRepo } = setup({ ...baseContact, optedOut: true });
    const result = await service.execute(send({ contactId: 'ct1' }));
    expect(result).toEqual(expect.objectContaining({ success: true, result: expect.objectContaining({ skipped: true }) }));
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it('still answers an opted-out contact who writes to us again', async () => {
    const { service, messageRepo } = setup({ ...baseContact, optedOut: true });
    await service.execute(send({ inbound: true, sessionId: 'inbound-session' }));
    expect(messageRepo.create).toHaveBeenCalled();
  });

  it('sends no second welcome when the chatbot greets a contact who wrote first', async () => {
    const { service, messageRepo } = setup();
    const result = await service.execute(send({ contactId: 'ct1', welcomeByChatbot: true }));
    expect(result).toEqual(expect.objectContaining({ success: true, result: expect.objectContaining({ skipped: true }) }));
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it('sends no second welcome when a "Lead Ad Received" rule greets the lead', async () => {
    const { service, messageRepo } = setup();
    const result = await service.execute(send({ contactId: 'ct1', welcomeByLeadAdRule: true }));
    expect(result).toEqual(expect.objectContaining({ success: true, result: expect.objectContaining({ skipped: true }) }));
    expect(messageRepo.create).not.toHaveBeenCalled();
  });

  it('never messages a deleted or merged contact', async () => {
    for (const contact of [
      { ...baseContact, deletedAt: new Date() },
      { ...baseContact, mergedIntoId: 'other' },
    ]) {
      const { service, messageRepo } = setup(contact);
      await service.execute(send({ inbound: true, sessionId: 's' }));
      expect(messageRepo.create).not.toHaveBeenCalled();
    }
  });
});
