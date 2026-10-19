import { checkTestRecipient } from './test-recipient-guard.util';

describe('checkTestRecipient', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
  });

  it('allows a listed number in any format', () => {
    process.env.NODE_ENV = 'development';
    process.env.WHATSAPP_TEST_NUMBERS = '+91 98765 43210, 919000000001';
    expect(checkTestRecipient('919876543210')).toBeNull();
    expect(checkTestRecipient('9000000001')).toBeNull();
  });

  it('blocks an unlisted number in development', () => {
    process.env.NODE_ENV = 'development';
    process.env.WHATSAPP_TEST_NUMBERS = '919876543210';
    expect(checkTestRecipient('918888888888')).toContain('not in WHATSAPP_TEST_NUMBERS');
  });

  it('blocks everything when the list is empty', () => {
    process.env.NODE_ENV = 'development';
    process.env.WHATSAPP_TEST_NUMBERS = '';
    expect(checkTestRecipient('919876543210')).not.toBeNull();
  });

  it('allows every number in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.WHATSAPP_TEST_MODE;
    expect(checkTestRecipient('918888888888')).toBeNull();
  });

  it('respects WHATSAPP_TEST_MODE overrides', () => {
    process.env.NODE_ENV = 'production';
    process.env.WHATSAPP_TEST_MODE = 'true';
    process.env.WHATSAPP_TEST_NUMBERS = '';
    expect(checkTestRecipient('918888888888')).not.toBeNull();

    process.env.NODE_ENV = 'development';
    process.env.WHATSAPP_TEST_MODE = 'false';
    expect(checkTestRecipient('918888888888')).toBeNull();
  });
});
