import { resolveTestRecipient, testRecipientOrThrow } from './test-recipient-guard.util';

describe('resolveTestRecipient', () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    delete process.env.WHATSAPP_TEST_MODE;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it('sends to a listed number as is, in any format', () => {
    process.env.WHATSAPP_TEST_NUMBERS = '+91 98765 43210, 919000000001';
    expect(resolveTestRecipient('919876543210')).toBe('919876543210');
    expect(resolveTestRecipient('+919000000001')).toBe('+919000000001');
  });

  it('redirects anyone else to the first test number, in E.164', () => {
    process.env.WHATSAPP_TEST_NUMBERS = '9876543210, 919000000001';
    expect(resolveTestRecipient('+918110822979')).toBe('+919876543210');
    expect(resolveTestRecipient('+971501234567')).toBe('+919876543210');
  });

  it('has nowhere to send when the list is empty', () => {
    process.env.WHATSAPP_TEST_NUMBERS = '';
    expect(resolveTestRecipient('919876543210')).toBeNull();
    expect(() => testRecipientOrThrow('919876543210')).toThrow('WHATSAPP_TEST_NUMBERS is empty');
  });

  it('sends to the real recipient in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.WHATSAPP_TEST_NUMBERS = '9876543210';
    expect(resolveTestRecipient('+918110822979')).toBe('+918110822979');
  });

  it('respects WHATSAPP_TEST_MODE overrides', () => {
    process.env.WHATSAPP_TEST_NUMBERS = '9876543210';

    process.env.NODE_ENV = 'production';
    process.env.WHATSAPP_TEST_MODE = 'true';
    expect(resolveTestRecipient('+918110822979')).toBe('+919876543210');

    process.env.NODE_ENV = 'development';
    process.env.WHATSAPP_TEST_MODE = 'false';
    expect(resolveTestRecipient('+918110822979')).toBe('+918110822979');
  });
});
