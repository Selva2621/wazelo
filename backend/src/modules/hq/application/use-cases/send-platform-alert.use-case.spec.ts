import { SendPlatformAlertUseCase } from './send-platform-alert.use-case';

const TEMPLATE = {
  name: 'wazelo_trial_ending',
  language: 'en',
  status: 'APPROVED',
  components: [{ type: 'BODY', text: 'Hi {{1}}, the trial of {{2}} ends in {{3}}.' }],
};

function setup(over: { hqId?: string | null; recipient?: any; sessionId?: string | null; template?: any } = {}) {
  const repo = {
    findHqId: jest.fn().mockResolvedValue(over.hqId === undefined ? 'hq' : over.hqId),
    alertRecipient: jest
      .fn()
      .mockResolvedValue(over.recipient === undefined ? { contactId: 'c1', phone: '+919000000001', firstName: 'Priya', orgName: 'Acme', mayMessage: true } : over.recipient),
    findHqSessionId: jest.fn().mockResolvedValue(over.sessionId === undefined ? 's1' : over.sessionId),
    findSendableTemplate: jest.fn().mockResolvedValue(over.template === undefined ? TEMPLATE : over.template),
  };
  const outbound = { send: jest.fn().mockResolvedValue({ messageId: 'm1' }) };
  return { uc: new SendPlatformAlertUseCase(repo as any, outbound as any), repo, outbound };
}

describe('SendPlatformAlertUseCase', () => {
  it("sends HQ's approved template from HQ's number, filled in, once per scope", async () => {
    const t = setup();
    await expect(t.uc.execute('trial_ending', 'cust', 'sub1:3d', '3 days')).resolves.toBe('sent');
    expect(t.repo.findSendableTemplate).toHaveBeenCalledWith('hq', 'wazelo_trial_ending');
    expect(t.outbound.send).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'hq',
        sessionId: 's1',
        contactPhone: '+919000000001',
        contactId: 'c1',
        body: 'Hi Priya, the trial of Acme ends in 3 days.',
        idempotencyKey: 'hq-alert:trial_ending:cust:sub1:3d',
      }),
    );
  });

  it.each([
    ['no HQ', { hqId: null }, 'no_hq'],
    ['no HQ contact for the workspace', { recipient: null }, 'no_recipient'],
    ['no WhatsApp consent', { recipient: { contactId: 'c1', phone: '+91', firstName: 'P', orgName: 'A', mayMessage: false } }, 'no_consent'],
    ['HQ has no connected number', { sessionId: null }, 'no_hq_number'],
    ['the template is missing or not approved', { template: null }, 'no_template'],
  ])('skips quietly when %s', async (_label, over, outcome) => {
    const t = setup(over as any);
    await expect(t.uc.execute('trial_ending', 'cust', 'x')).resolves.toBe(outcome);
    expect(t.outbound.send).not.toHaveBeenCalled();
  });

  it('never alerts HQ about itself', async () => {
    const t = setup();
    await expect(t.uc.execute('payment_failed', 'hq', 'p1')).resolves.toBe('no_hq');
  });
});
