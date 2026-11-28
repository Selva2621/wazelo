import { hqMessageKind, logRangeEnd, toHqMessageLogEntry } from './hq-message-log';

describe('hq-message-log', () => {
  it('reads the kind from metadata.platformAlert', () => {
    expect(hqMessageKind({ platformAlert: 'login_code' })).toBe('login_code');
    expect(hqMessageKind({ platformAlert: 'something_new' })).toBe('other');
    expect(hqMessageKind(null)).toBe('other');
  });

  it('treats a bare "to" date as the end of that day', () => {
    expect(logRangeEnd('2026-11-28').toISOString()).toBe('2026-11-28T23:59:59.999Z');
    expect(logRangeEnd('2026-11-28T10:00:00.000Z').toISOString()).toBe('2026-11-28T10:00:00.000Z');
  });

  it('shows a row as stored, with who sent it and how', () => {
    const entry = toHqMessageLogEntry({
      id: 'm1',
      status: 'DELIVERED',
      contactPhone: '+919876543228',
      body: '•••••• is your Wazelo verification code.',
      metadata: { platformAlert: 'verification_code' },
      failedReason: null,
      retryCount: 0,
      createdAt: new Date('2026-11-28T10:00:00Z'),
      sentAt: new Date('2026-11-28T10:00:05Z'),
      deliveredAt: null,
      readAt: null,
      session: { provider: 'CLOUD_API', phoneNumber: '+911234567890' },
    });
    expect(entry).toMatchObject({
      kind: 'verification_code',
      to: '+919876543228',
      from: '+911234567890',
      via: 'CLOUD_API',
      body: '•••••• is your Wazelo verification code.',
    });
  });
});
