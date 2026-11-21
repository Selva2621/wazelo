import { createHmac } from 'crypto';
import { parseCloudWebhook, verifyCloudSignature } from './cloud-webhook-parser';

const webhook = (value: Record<string, unknown>) => ({
  object: 'whatsapp_business_account',
  entry: [{ id: 'waba-1', changes: [{ field: 'messages', value: { metadata: { phone_number_id: 'pn-1' }, ...value } }] }],
});

describe('parseCloudWebhook', () => {
  it('maps a text message with the sender name', () => {
    const [batch] = parseCloudWebhook(
      webhook({
        contacts: [{ wa_id: '919000020001', profile: { name: 'Priya' } }],
        messages: [{ id: 'wamid.1', from: '919000020001', timestamp: '1731200000', type: 'text', text: { body: 'Hi' } }],
      }),
    );
    expect(batch.phoneNumberId).toBe('pn-1');
    expect(batch.incoming).toEqual([
      expect.objectContaining({
        whatsappMessageId: 'wamid.1',
        contactPhone: '+919000020001',
        contactName: 'Priya',
        type: 'TEXT',
        body: 'Hi',
        timestamp: 1731200000,
        fromMe: false,
      }),
    ]);
  });

  it('uses the picked button or list title as the body', () => {
    const [batch] = parseCloudWebhook(
      webhook({
        messages: [
          { id: 'a', from: '91', timestamp: '1', type: 'interactive', interactive: { button_reply: { id: 'yes', title: 'Yes please' } } },
          { id: 'b', from: '91', timestamp: '1', type: 'button', button: { text: 'Call me' } },
        ],
      }),
    );
    expect(batch.incoming.map((m) => m.body)).toEqual(['Yes please', 'Call me']);
  });

  it('keeps a media caption and type', () => {
    const [batch] = parseCloudWebhook(
      webhook({ messages: [{ id: 'm', from: '91', timestamp: '1', type: 'image', image: { id: 'media-1', caption: 'site photo', mime_type: 'image/jpeg' } }] }),
    );
    expect(batch.incoming[0]).toEqual(expect.objectContaining({ type: 'IMAGE', body: 'site photo', mediaMimeType: 'image/jpeg' }));
  });

  it('maps delivery statuses, with the error for a failure', () => {
    const [batch] = parseCloudWebhook(
      webhook({
        statuses: [
          { id: 'wamid.9', status: 'delivered', timestamp: '5' },
          { id: 'wamid.8', status: 'failed', timestamp: '6', errors: [{ code: 131047, title: 'Re-engagement message' }] },
        ],
      }),
    );
    expect(batch.statuses).toEqual([
      { whatsappMessageId: 'wamid.9', status: 'delivered', timestamp: 5 },
      { whatsappMessageId: 'wamid.8', status: 'failed', timestamp: 6, errorCode: 131047, errorMessage: 'Re-engagement message' },
    ]);
  });

  it('ignores other fields, unknown types and empty bodies', () => {
    expect(parseCloudWebhook({ entry: [{ changes: [{ field: 'account_update', value: {} }] }] })).toEqual([]);
    expect(parseCloudWebhook(webhook({ messages: [{ id: 'x', from: '91', type: 'reaction' }] }))).toEqual([]);
    expect(parseCloudWebhook(null)).toEqual([]);
  });
});

describe('verifyCloudSignature', () => {
  const secret = 'a'.repeat(32);
  const body = Buffer.from('{"entry":[]}');
  const good = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

  it('accepts the right signature only', () => {
    expect(verifyCloudSignature(body, good, secret)).toBe(true);
    expect(verifyCloudSignature(body, good, 'b'.repeat(32))).toBe(false);
    expect(verifyCloudSignature(Buffer.from('{}'), good, secret)).toBe(false);
    expect(verifyCloudSignature(body, undefined, secret)).toBe(false);
    expect(verifyCloudSignature(body, 'sha256=short', secret)).toBe(false);
  });
});
