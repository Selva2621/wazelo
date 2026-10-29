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

describe('WidgetLeadsService', () => {
  function setup({ created = true, visitorMessages = 1 } = {}) {
    const prisma = {
      user: {
        findFirst: jest.fn(async () => ({ id: 'admin1' })),
        findMany: jest.fn(async () => [{ id: 'admin1' }, { id: 'mgr1' }]),
      },
      widgetMessage: { count: jest.fn(async () => visitorMessages) },
    };
    const contacts = {
      upsertByPhone: jest.fn(async () => ({ contact: { id: 'ct1' }, created })),
      findOrCreateTag: jest.fn(async () => ({ id: 'tag1' })),
      addTagToContact: jest.fn(async () => ({})),
    };
    const notifications = { dispatchToOrg: jest.fn(async () => undefined) };
    const events = { emit: jest.fn() };
    const service = new WidgetLeadsService(prisma as never, contacts as never, notifications as never, events as never);
    return { service, contacts, notifications, events };
  }

  const msg = { orgId: 'o1', sessionId: 'ws1', messageId: 'm1', visitorName: 'Ravi', visitorPhone: '+91 98765 43210', body: 'Do you design logos?' };

  it('turns a visitor with a phone into a tagged contact, runs "contact created", alerts the team', async () => {
    const { service, contacts, notifications, events } = setup();
    expect(await service.capture(msg)).toEqual({ contactId: 'ct1', created: true });
    expect(contacts.upsertByPhone).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '+919876543210', name: 'Ravi', source: 'WEBSITE' }),
      'admin1',
    );
    expect(contacts.findOrCreateTag).toHaveBeenCalledWith('o1', 'website-chat');
    expect(events.emit).toHaveBeenCalledWith('contact.created', expect.objectContaining({ contactId: 'ct1' }));
    expect(notifications.dispatchToOrg).toHaveBeenCalledWith(
      'o1', ['admin1', 'mgr1'], 'MESSAGE_RECEIVED', 'HIGH', 'Ravi asked on your website', 'Do you design logos?', expect.anything(), 'widget-lead:ws1',
    );
  });

  it('existing contact: no new "contact created"; later messages in the chat: no repeat alert', async () => {
    const { service, events, notifications } = setup({ created: false, visitorMessages: 3 });
    await service.capture(msg);
    expect(events.emit).not.toHaveBeenCalled();
    expect(notifications.dispatchToOrg).not.toHaveBeenCalled();
  });

  it('does nothing without a usable phone number', async () => {
    const { service, contacts } = setup();
    expect(await service.capture({ ...msg, visitorPhone: undefined })).toBeNull();
    expect(contacts.upsertByPhone).not.toHaveBeenCalled();
  });
});
