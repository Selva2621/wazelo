import { OrgEmailService } from './org-email.service';
import { fillFields, toEmailHtml } from '../../domain/services/email-render';
import { readUnsubscribe, signUnsubscribe } from '../../domain/services/unsubscribe-token';

const account = {
  orgId: 'o1',
  status: 'ACTIVE',
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  username: 'hello@kavya.in',
  encryptedPassword: 'enc',
  fromName: 'Kavya Boutique',
  fromAddress: 'hello@kavya.in',
  replyTo: null,
};

function setup(opts: { account?: Record<string, unknown> | null; contact?: Record<string, unknown> | null; slot?: boolean } = {}) {
  const rows: Record<string, Record<string, unknown>> = {};
  const repo = {
    findByKey: jest.fn(async () => null),
    account: jest.fn(async () => (opts.account === undefined ? account : opts.account)),
    businessName: jest.fn(async () => ({ name: 'Kavya' })),
    contact: jest.fn(async () =>
      opts.contact === undefined
        ? { id: 'ct1', name: 'Ravi Kumar', email: 'ravi@example.com', phoneNumber: '+919000000001', emailOptedOut: false, deletedAt: null, mergedIntoId: null }
        : opts.contact,
    ),
    createMessage: jest.fn(async (data: Record<string, unknown>) => {
      rows.m1 = { id: 'm1', ...data };
      return rows.m1;
    }),
    message: jest.fn(async () => rows.m1 ?? null),
    takeDailySlot: jest.fn(async () => opts.slot ?? true),
    countAttempt: jest.fn(async () => ({ attempts: 1 })),
    finishMessage: jest.fn(async () => true),
    setAccountStatus: jest.fn(async () => ({})),
  };
  const queue = { publish: jest.fn(async () => 'j1'), publishDelayed: jest.fn(async () => 'j2') };
  const mailer = { send: jest.fn(async () => ({ messageId: '<abc@gmail>' })) };
  const encryption = { decrypt: jest.fn(() => 'app-password') };
  const config = { get: jest.fn((k: string) => ({ 'app.frontendUrl': 'https://app.wazelo.in', 'app.apiPrefix': 'api/v1', 'jwt.accessSecret': 's3cret' })[k]) };
  const events = { emit: jest.fn() };
  const service = new OrgEmailService(repo as never, queue as never, mailer as never, encryption as never, config as never, events as never);
  return { service, repo, queue, mailer, events, rows };
}

const input = { orgId: 'o1', contactId: 'ct1', subject: 'Hi {{name}}', body: 'Welcome to {{company}}!', source: 'CAMPAIGN' as const, sourceId: 'c1', idempotencyKey: 'k1' };

describe('email rendering', () => {
  it('{{name}} is the first name like WhatsApp; unknown fields stay; missing name → "there"', () => {
    expect(fillFields('Hi {{name}} ({{full_name}}) {{foo}}', { name: 'Ravi Kumar' })).toBe('Hi Ravi (Ravi Kumar) {{foo}}');
    expect(fillFields('Hi {{ name }}', {})).toBe('Hi there');
  });
  it('HTML is escaped, links clickable, with an unsubscribe footer', () => {
    const html = toEmailHtml('<b>Sale</b> at https://kavya.in\n\nBye', { business: 'Kavya', unsubscribeUrl: 'https://u' });
    expect(html).toContain('&lt;b&gt;Sale&lt;/b&gt;');
    expect(html).toContain('<a href="https://kavya.in"');
    expect(html).toContain('Unsubscribe');
  });
  it('unsubscribe tokens can be read back, and a tampered one is refused', () => {
    const t = signUnsubscribe('o1', 'ct1', 'secret');
    expect(readUnsubscribe(t, 'secret')).toEqual({ orgId: 'o1', contactId: 'ct1' });
    expect(readUnsubscribe(`${t}x`, 'secret')).toBeNull();
    expect(readUnsubscribe(t, 'other')).toBeNull();
  });
});

describe('OrgEmailService', () => {
  it('queues an email for a reachable contact, with the fields filled and a log row', async () => {
    const { service, repo, queue } = setup();
    expect(await service.queue(input)).toEqual({ emailMessageId: 'm1', status: 'QUEUED' });
    expect(repo.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ toAddress: 'ravi@example.com', subject: 'Hi Ravi', body: 'Welcome to Kavya Boutique!', status: 'QUEUED', source: 'CAMPAIGN' }),
    );
    expect(queue.publish).toHaveBeenCalledWith('send-org-email', { emailMessageId: 'm1' }, expect.objectContaining({ retryLimit: 3 }));
  });

  it.each([
    [{ account: null }, 'No email account connected'],
    [{ account: { ...account, status: 'ERROR' } }, 'The email account needs to be reconnected'],
    [{ contact: { id: 'ct1', email: 'ravi@example.com', emailOptedOut: true, deletedAt: null, mergedIntoId: null } }, 'Unsubscribed from email'],
    [{ contact: { id: 'ct1', email: null, emailOptedOut: false, deletedAt: null, mergedIntoId: null } }, 'No valid email address'],
  ])('skips with the reason and logs it: %o', async (opts, reason) => {
    const { service, repo, queue } = setup(opts);
    expect(await service.queue(input)).toMatchObject({ status: 'SKIPPED', reason });
    expect(repo.createMessage).toHaveBeenCalledWith(expect.objectContaining({ status: 'SKIPPED', error: reason }));
    expect(queue.publish).not.toHaveBeenCalled();
  });

  it('sends with an unsubscribe link, marks it SENT and tells campaigns', async () => {
    const { service, repo, mailer, events } = setup();
    await service.queue(input);
    await service.deliver({ emailMessageId: 'm1' });
    const mail = (mailer.send.mock.calls[0] as unknown[])[1] as { unsubscribeUrl: string; from: unknown };
    expect(mail.unsubscribeUrl).toMatch(/^https:\/\/app\.wazelo\.in\/api\/v1\/email\/unsubscribe\?t=/);
    expect(mail.from).toEqual({ name: 'Kavya Boutique', address: 'hello@kavya.in' });
    expect(repo.finishMessage).toHaveBeenCalledWith('m1', 'SENT', { providerMessageId: '<abc@gmail>' });
    expect(events.emit).toHaveBeenCalledWith('email.sent', expect.objectContaining({ emailMessageId: 'm1', source: 'CAMPAIGN', sourceId: 'c1' }));
  });

  it("daily limit reached: waits for tomorrow instead of sending (the mailbox doesn't get blocked)", async () => {
    const { service, mailer, queue } = setup({ slot: false });
    await service.queue(input);
    await service.deliver({ emailMessageId: 'm1' });
    expect(mailer.send).not.toHaveBeenCalled();
    expect(queue.publishDelayed).toHaveBeenCalledWith('send-org-email', { emailMessageId: 'm1' }, expect.any(Number));
  });

  it('a busy server is retried (throws); a wrong login fails for good and flags the account', async () => {
    const a = setup();
    await a.service.queue(input);
    a.mailer.send.mockRejectedValueOnce(Object.assign(new Error('try later'), { code: 'ETIMEDOUT' }));
    await expect(a.service.deliver({ emailMessageId: 'm1' })).rejects.toThrow('try later');
    expect(a.repo.finishMessage).not.toHaveBeenCalled();

    const b = setup();
    await b.service.queue(input);
    b.mailer.send.mockRejectedValueOnce(Object.assign(new Error('Invalid login'), { code: 'EAUTH' }));
    await b.service.deliver({ emailMessageId: 'm1' });
    expect(b.repo.finishMessage).toHaveBeenCalledWith('m1', 'FAILED', { error: 'Invalid login' });
    expect(b.repo.setAccountStatus).toHaveBeenCalledWith('o1', 'ERROR', 'Invalid login');
    expect(b.events.emit).toHaveBeenCalledWith('email.failed', expect.objectContaining({ error: 'Invalid login' }));
  });
});
