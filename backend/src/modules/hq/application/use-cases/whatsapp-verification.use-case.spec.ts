import { BadRequestException, HttpException, ServiceUnavailableException } from '@nestjs/common';
import { hashOtp } from '../../domain/services/whatsapp-otp';
import { WhatsappVerificationUseCase } from './whatsapp-verification.use-case';

const TEMPLATE = { name: 'wazelo_verification_code', language: 'en', status: 'APPROVED', components: [{ type: 'BODY', text: 'Your Wazelo code is {{1}}' }] };

function setup(over: { user?: any; sessionId?: string | null; template?: any; sent?: Date[]; open?: any; attemptsAfter?: number; marked?: boolean } = {}) {
  const repo = {
    findHqId: jest.fn().mockResolvedValue('hq'),
    findUserPhone: jest.fn().mockResolvedValue(over.user === undefined ? { id: 'u1', orgId: 'cust', phone: '+919000000001', phoneVerifiedAt: null } : over.user),
    findHqSessionId: jest.fn().mockResolvedValue(over.sessionId === undefined ? 's1' : over.sessionId),
    findSendableTemplate: jest.fn().mockResolvedValue(over.template === undefined ? TEMPLATE : over.template),
    verificationsSentSince: jest.fn().mockResolvedValue(over.sent ?? []),
    createVerification: jest.fn().mockResolvedValue({ id: 'v1' }),
    latestOpenVerification: jest.fn().mockResolvedValue(over.open === undefined ? { id: 'v1', codeHash: hashOtp('u1', '123456'), attempts: 0 } : over.open),
    addAttempt: jest.fn().mockResolvedValue(over.attemptsAfter ?? 1),
    markVerified: jest.fn().mockResolvedValue(over.marked ?? true),
    findContactForOrg: jest.fn().mockResolvedValue({ id: 'c1', ownerId: 'o1' }),
  };
  const outbound = { send: jest.fn().mockResolvedValue({ messageId: 'm1' }) };
  const contacts = { findOrCreateTag: jest.fn().mockResolvedValue({ id: 't1' }), addTagToContact: jest.fn() };
  return { uc: new WhatsappVerificationUseCase(repo as any, outbound as any, contacts as any), repo, outbound, contacts };
}

describe('WhatsappVerificationUseCase.send', () => {
  it("sends a fresh code to the user's own number from HQ, storing only its hash", async () => {
    const t = setup();
    await expect(t.uc.send('u1')).resolves.toEqual({ sent: true, expiresInSeconds: 600 });
    const stored = t.repo.createVerification.mock.calls[0][0];
    expect(stored).toEqual(expect.objectContaining({ userId: 'u1', phone: '+919000000001' }));
    const sent = t.outbound.send.mock.calls[0][0];
    expect(sent).toEqual(expect.objectContaining({ orgId: 'hq', sessionId: 's1', contactPhone: '+919000000001', idempotencyKey: 'hq-otp:v1' }));
    const code = sent.body.replace('Your Wazelo code is ', '');
    expect(code).toMatch(/^\d{6}$/);
    expect(stored.codeHash).toBe(hashOtp('u1', code));
  });

  it('503 when HQ has no number or no approved template (onboarding hides the step)', async () => {
    await expect(setup({ sessionId: null }).uc.send('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(setup({ template: null }).uc.send('u1')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('refuses without a number, or when already verified', async () => {
    await expect(setup({ user: { id: 'u1', orgId: 'cust', phone: null, phoneVerifiedAt: null } }).uc.send('u1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup({ user: { id: 'u1', orgId: 'cust', phone: '+91', phoneVerifiedAt: new Date() } }).uc.send('u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('429 inside the resend cooldown', async () => {
    const t = setup({ sent: [new Date(Date.now() - 10_000)] });
    await expect(t.uc.send('u1')).rejects.toBeInstanceOf(HttpException);
    expect(t.outbound.send).not.toHaveBeenCalled();
  });
});

describe('WhatsappVerificationUseCase.confirm', () => {
  it('right code: verified and tagged in HQ', async () => {
    const t = setup();
    await expect(t.uc.confirm('u1', '123456')).resolves.toEqual({ verified: true });
    expect(t.repo.markVerified).toHaveBeenCalledWith('v1', 'u1', '+919000000001');
    expect(t.contacts.findOrCreateTag).toHaveBeenCalledWith('hq', 'whatsapp-verified');
  });

  it('wrong code counts a try and says how many are left', async () => {
    const t = setup({ attemptsAfter: 2 });
    await expect(t.uc.confirm('u1', '000000')).rejects.toThrow('Wrong code. 3 tries left.');
    expect(t.repo.markVerified).not.toHaveBeenCalled();
  });

  it('after 5 wrong tries the code is dead', async () => {
    const t = setup({ open: { id: 'v1', codeHash: hashOtp('u1', '123456'), attempts: 5 } });
    await expect(t.uc.confirm('u1', '123456')).rejects.toThrow('expired');
  });

  it('no live code (expired or never sent)', async () => {
    await expect(setup({ open: null }).uc.confirm('u1', '123456')).rejects.toThrow('expired');
  });
});
