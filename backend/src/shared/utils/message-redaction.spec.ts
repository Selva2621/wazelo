import { redactDigits, redactedCopy } from './message-redaction';

describe('message-redaction', () => {
  it('replaces runs of four or more digits', () => {
    expect(redactDigits('482913 is your Wazelo verification code. It expires in 10 minutes.')).toBe(
      '•••••• is your Wazelo verification code. It expires in 10 minutes.',
    );
  });

  it('leaves messages that are not flagged alone', () => {
    expect(redactedCopy('Order 123456 shipped', { campaignId: 'c1' })).toBeNull();
    expect(redactedCopy('Order 123456 shipped', null)).toBeNull();
  });

  it('redacts the body and the template values of a flagged message', () => {
    const copy = redactedCopy('482913 is your Wazelo verification code.', {
      redactAfterSend: true,
      platformAlert: 'login_code',
      cloudTemplate: { name: 'wazelo_verification_code', language: 'en', params: ['482913'] },
    });
    expect(copy).toEqual({
      body: '•••••• is your Wazelo verification code.',
      metadata: {
        redactAfterSend: true,
        platformAlert: 'login_code',
        cloudTemplate: { name: 'wazelo_verification_code', language: 'en', params: ['••••••'] },
      },
    });
    expect(JSON.stringify(copy)).not.toContain('482913');
  });
});
