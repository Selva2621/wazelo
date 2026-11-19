import { WidgetLeadsService, normalizeVisitorPhone } from './widget-leads.service';

describe('normalizeVisitorPhone', () => {
  it('keeps a plausible number, digits only (with + when given)', () => {
    expect(normalizeVisitorPhone('+91 98765-43210')).toBe('+919876543210');
    expect(normalizeVisitorPhone('98765 43210')).toBe('9876543210');
  });
  it('ignores empty or implausible input', () => {
    expect(normalizeVisitorPhone('')).toBeNull();
    expect(normalizeVisitorPhone('12345')).toBeNull();
    expect(normalizeVisitorPhone('call me')).toBeNull();
  });
});

describe('WidgetLeadsService (consented visitors only)', () => {
  function setup({ created = true, admin = true } = {}) {
    const prisma = {
      user: {
        findFirst: jest.fn(async () => (admin ? { id: 'admin1' } : null)),
        findMany: jest.fn(async () => [{ id: 'admin1' }, { id: 'mgr1' }]),
      },
      consentRecord: { create: jest.fn(async () => ({})) },
      contact: {
        updateMany: jest.fn(async () => ({ count: 1 })),
        findFirst: jest.fn(async (): Promise<Record<string, unknown> | null> => null),
      },
    };
    const contacts = {
      upsertByPhone: jest.fn(async () => ({ contact: { id: 'ct1' }, created })),
      findOrCreateTag: jest.fn(async () => ({ id: 'tag1' })),
      addTagToContact: jest.fn(async () => ({})),
    };
    const notifications = { dispatchToOrg: jest.fn(async () => undefined) };
    const events = { emit: jest.fn() };
    const service = new WidgetLeadsService(prisma as never, contacts as never, notifications as never, events as never);
    return { service, prisma, contacts, notifications, events };
  }

  const visitor = {
    orgId: 'o1',
    sessionId: 'ws1',
    phone: '+919876543210',
    email: 'ravi@example.com',
    name: 'Ravi',
    consentText: 'I agree to be contacted by Kavya on WhatsApp and email.',
    ipAddress: '1.2.3.4',
  };

  it('new contact: saved with email, tagged, consent stored word for word, team alerted — but no welcome yet', async () => {
    const { service, prisma, contacts, notifications, events } = setup();
    expect(await service.capture(visitor)).toEqual({ contactId: 'ct1', created: true });
    expect(contacts.upsertByPhone).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '+919876543210', name: 'Ravi', source: 'WEBSITE' }),
      'admin1',
    );
    expect(prisma.contact.updateMany).toHaveBeenCalledWith({ where: { id: 'ct1', email: null }, data: { email: 'ravi@example.com' } });
    expect(contacts.findOrCreateTag).toHaveBeenCalledWith('o1', 'website-chat');
    expect(prisma.consentRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        contactId: 'ct1',
        granted: true,
        source: 'website_chat',
        ipAddress: '1.2.3.4',
        metadata: expect.objectContaining({ channels: ['WHATSAPP', 'EMAIL'], text: visitor.consentText }),
      }),
    });
    // The welcome waits until the website chat ends
    expect(events.emit).not.toHaveBeenCalled();
    expect(notifications.dispatchToOrg).toHaveBeenCalledWith(
      'o1', ['admin1', 'mgr1'], 'MESSAGE_RECEIVED', 'NORMAL', 'Ravi started a chat on your website',
      expect.stringContaining('when the chat ends'), expect.anything(), 'widget-lead:ws1',
    );
  });

  it('existing contact: linked and consent stored, team told it is already a contact', async () => {
    const { service, prisma, notifications } = setup({ created: false });
    expect(await service.capture(visitor)).toEqual({ contactId: 'ct1', created: false });
    expect(prisma.consentRecord.create).toHaveBeenCalled();
    expect(notifications.dispatchToOrg).toHaveBeenCalledWith(
      'o1', expect.anything(), 'MESSAGE_RECEIVED', 'NORMAL', expect.any(String), expect.stringContaining('Already a contact'), expect.anything(), 'widget-lead:ws1',
    );
  });

  it('releaseWelcome: "contact created" runs when the chat ends; not for an opted-out contact', async () => {
    const a = setup();
    a.prisma.contact.findFirst.mockResolvedValueOnce({ id: 'ct1', phoneNumber: '+919876543210', ownerId: 'admin1', optedOut: false });
    expect(await a.service.releaseWelcome('o1', 'ct1')).toBe(true);
    expect(a.events.emit).toHaveBeenCalledWith('contact.created', expect.objectContaining({ contactId: 'ct1', source: 'WEBSITE' }));

    const b = setup();
    b.prisma.contact.findFirst.mockResolvedValueOnce({ id: 'ct1', phoneNumber: '+91', ownerId: 'admin1', optedOut: true });
    expect(await b.service.releaseWelcome('o1', 'ct1')).toBe(false);
    expect(b.events.emit).not.toHaveBeenCalled();
  });

  it('no admin to own the contact: nothing is created', async () => {
    const { service, contacts } = setup({ admin: false });
    expect(await service.capture(visitor)).toBeNull();
    expect(contacts.upsertByPhone).not.toHaveBeenCalled();
  });
});
