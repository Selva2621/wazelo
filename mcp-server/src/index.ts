#!/usr/bin/env node
/**
 * Wazelo MCP server (stdio).
 *
 * Exposes the Wazelo Developer API as MCP tools so an AI assistant can look up
 * contacts, read conversations and deals, update leads and send WhatsApp
 * messages. Every call is made with the org's API key, so the key's scopes,
 * plan limits and rate limits apply exactly as they do for any API client.
 *
 * Env:
 *   WAZELO_API_URL  e.g. https://app.example.com/api/v1
 *   WAZELO_API_KEY  an API key from Settings → API Keys
 */
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { WazeloClient } from './client.js';

const apiUrl = process.env.WAZELO_API_URL;
const apiKey = process.env.WAZELO_API_KEY;
if (!apiUrl || !apiKey) {
  console.error('wazelo-mcp: set WAZELO_API_URL (e.g. https://app.example.com/api/v1) and WAZELO_API_KEY');
  process.exit(1);
}

const api = new WazeloClient(apiUrl, apiKey);
const server = new McpServer({ name: 'wazelo', version: '0.1.0' });

// ── helpers ──

const phone = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, 'Phone in international format, e.g. +919876543210')
  .describe('Phone number in international format, e.g. +919876543210');
const uuid = (what: string) => z.string().uuid().describe(`${what} ID`);
const limit = z.number().int().min(1).max(100).optional().describe('Page size (default 20, max 100)');
const cursor = z.string().uuid().optional().describe('nextCursor from the previous page');
const leadStatus = z.enum(['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'CLOSED']);

const READ = { readOnlyHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;
/** Sends to a real person on WhatsApp: cannot be undone. */
const SEND = { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true } as const;

/** Run an API call and return it as tool output; errors become isError results. */
async function run(fn: () => Promise<unknown>) {
  try {
    const result = await fn();
    return { content: [{ type: 'text' as const, text: JSON.stringify(result ?? { ok: true }, null, 2) }] };
  } catch (err) {
    return { isError: true, content: [{ type: 'text' as const, text: (err as Error).message }] };
  }
}

// ── Contacts ──

server.registerTool(
  'search_contacts',
  {
    title: 'Search contacts',
    description:
      'Find contacts by part of a name, phone or email, by exact phone, or by lead status. Returns a page; pass nextCursor to get more.',
    inputSchema: {
      search: z.string().max(100).optional().describe('Part of a name, phone number or email'),
      phone: phone.optional(),
      leadStatus: leadStatus.optional(),
      limit,
      cursor,
    },
    annotations: READ,
  },
  (args) => run(() => api.get('/contacts', args)),
);

server.registerTool(
  'get_contact',
  {
    title: 'Get contact',
    description: 'Full contact record: lead status, score, owner, tags and custom metadata.',
    inputSchema: { contactId: uuid('Contact') },
    annotations: READ,
  },
  ({ contactId }) => run(() => api.get(`/contacts/${contactId}`)),
);

server.registerTool(
  'create_contact',
  {
    title: 'Create contact',
    description: 'Create a contact. If one with this phone already exists, it is returned instead (created: false).',
    inputSchema: {
      name: z.string().min(1).max(255),
      phone,
      email: z.string().max(320).optional(),
      metadata: z.record(z.unknown()).optional().describe('Custom fields as key/value pairs'),
    },
    annotations: WRITE,
  },
  (args) => run(() => api.post('/contacts', args)),
);

server.registerTool(
  'update_contact',
  {
    title: 'Update contact',
    description: "Change a contact's name, email or custom metadata.",
    inputSchema: {
      contactId: uuid('Contact'),
      name: z.string().min(1).max(255).optional(),
      email: z.string().max(320).optional(),
      metadata: z.record(z.unknown()).optional(),
    },
    annotations: WRITE,
  },
  ({ contactId, ...body }) => run(() => api.put(`/contacts/${contactId}`, body)),
);

server.registerTool(
  'change_lead_status',
  {
    title: 'Change lead status',
    description: "Move a contact's lead status. Triggers the same automations as doing it in the app.",
    inputSchema: {
      contactId: uuid('Contact'),
      status: leadStatus,
      reason: z.string().max(500).optional(),
    },
    annotations: WRITE,
  },
  ({ contactId, ...body }) => run(() => api.put(`/contacts/${contactId}/lead-status`, body)),
);

server.registerTool(
  'list_contact_notes',
  {
    title: 'List contact notes',
    description: 'Internal team notes on a contact, newest first.',
    inputSchema: { contactId: uuid('Contact'), limit },
    annotations: READ,
  },
  ({ contactId, limit }) => run(() => api.get(`/contacts/${contactId}/notes`, { limit })),
);

server.registerTool(
  'add_contact_note',
  {
    title: 'Add contact note',
    description: 'Add an internal note to a contact (not sent to the customer).',
    inputSchema: { contactId: uuid('Contact'), content: z.string().min(1).max(10000) },
    annotations: WRITE,
  },
  ({ contactId, content }) => run(() => api.post(`/contacts/${contactId}/notes`, { content })),
);

server.registerTool(
  'list_tags',
  {
    title: 'List tags',
    description: 'All contact tags in the organization.',
    inputSchema: {},
    annotations: READ,
  },
  () => run(() => api.get('/tags')),
);

server.registerTool(
  'tag_contact',
  {
    title: 'Tag contact',
    description: 'Add a tag to a contact. The tag is created if it does not exist.',
    inputSchema: {
      contactId: uuid('Contact'),
      name: z
        .string()
        .max(100)
        .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Letters, numbers, spaces, hyphens and underscores only'),
      color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().describe('Hex color like #22C55E'),
    },
    annotations: { ...WRITE, idempotentHint: true },
  },
  ({ contactId, ...body }) => run(() => api.post(`/contacts/${contactId}/tags`, body)),
);

server.registerTool(
  'untag_contact',
  {
    title: 'Remove tag from contact',
    description: 'Remove a tag from a contact. Use list_tags or get_contact to find the tag ID.',
    inputSchema: { contactId: uuid('Contact'), tagId: uuid('Tag') },
    annotations: { ...WRITE, idempotentHint: true },
  },
  ({ contactId, tagId }) => run(() => api.delete(`/contacts/${contactId}/tags/${tagId}`)),
);

// ── Conversations & messages ──

server.registerTool(
  'list_conversations',
  {
    title: 'List conversations',
    description:
      'Inbox conversations, most recent activity first. Filter by status, contact phone or contact ID. Includes the last message and unread count.',
    inputSchema: {
      status: z.enum(['OPEN', 'CLOSED', 'ARCHIVED']).optional(),
      contactPhone: phone.optional(),
      contactId: uuid('Contact').optional(),
      limit,
      cursor,
    },
    annotations: READ,
  },
  (args) => run(() => api.get('/conversations', args)),
);

server.registerTool(
  'get_conversation_messages',
  {
    title: 'Read conversation',
    description: 'Messages in one conversation, newest first. Use this to see what was said with a customer.',
    inputSchema: { conversationId: uuid('Conversation'), limit, cursor },
    annotations: READ,
  },
  ({ conversationId, ...q }) => run(() => api.get(`/conversations/${conversationId}/messages`, q)),
);

server.registerTool(
  'get_message_status',
  {
    title: 'Get message status',
    description: 'Delivery status of a sent message, with its status history (queued, sent, delivered, read, failed).',
    inputSchema: { messageId: uuid('Message') },
    annotations: READ,
  },
  ({ messageId }) => run(() => api.get(`/messages/${messageId}`)),
);

server.registerTool(
  'list_templates',
  {
    title: 'List message templates',
    description: 'Approved message templates, with their bodies and {{variables}}.',
    inputSchema: {},
    annotations: READ,
  },
  () => run(() => api.get('/templates')),
);

server.registerTool(
  'send_whatsapp_message',
  {
    title: 'Send WhatsApp message',
    description:
      'Send a text message to a customer on WhatsApp. This reaches a real person and cannot be undone: confirm the recipient and wording with the user first.',
    inputSchema: {
      to: phone,
      body: z.string().min(1).max(4096),
    },
    annotations: SEND,
  },
  ({ to, body }) =>
    run(() => api.post('/messages/send', { to, type: 'text', body }, { 'Idempotency-Key': `mcp-${randomUUID()}` })),
);

server.registerTool(
  'send_whatsapp_template',
  {
    title: 'Send WhatsApp template',
    description:
      'Send a saved template, filling its {{variables}}. Reaches a real person and cannot be undone: confirm with the user first.',
    inputSchema: {
      to: phone,
      templateName: z.string().min(1),
      languageCode: z.string().optional(),
      variables: z.record(z.string()).optional().describe('Values for the template {{variables}}, e.g. {"name": "Priya"}'),
    },
    annotations: SEND,
  },
  (args) =>
    run(() => api.post('/messages/send-template', args, { 'Idempotency-Key': `mcp-${randomUUID()}` })),
);

server.registerTool(
  'get_whatsapp_status',
  {
    title: 'WhatsApp connection status',
    description: 'Whether a WhatsApp number is connected and able to send.',
    inputSchema: {},
    annotations: READ,
  },
  () => run(() => api.get('/session/status')),
);

// ── Pipelines & deals ──

server.registerTool(
  'list_pipelines',
  {
    title: 'List pipelines',
    description: 'Sales pipelines and their stages, in order.',
    inputSchema: {},
    annotations: READ,
  },
  () => run(() => api.get('/pipelines')),
);

server.registerTool(
  'list_deals',
  {
    title: 'List deals',
    description:
      'Deals, recently updated first. Filter by contact, pipeline, stage or status. Includes value, stage, contact and next follow-up date.',
    inputSchema: {
      contactId: uuid('Contact').optional(),
      pipelineId: uuid('Pipeline').optional(),
      stageId: uuid('Stage').optional(),
      status: z.enum(['OPEN', 'WON', 'LOST']).optional(),
      limit,
      cursor,
    },
    annotations: READ,
  },
  (args) => run(() => api.get('/deals', args)),
);

server.registerTool(
  'get_deal',
  {
    title: 'Get deal',
    description: 'One deal with its stage, contact, value, notes and follow-up note.',
    inputSchema: { dealId: uuid('Deal') },
    annotations: READ,
  },
  ({ dealId }) => run(() => api.get(`/deals/${dealId}`)),
);

server.registerTool(
  'move_deal_stage',
  {
    title: 'Move deal to stage',
    description:
      "Move a deal to another stage of its own pipeline (see list_pipelines). Moving to a won or lost stage marks the deal won or lost. Triggers the same automations as dragging it on the board.",
    inputSchema: { dealId: uuid('Deal'), stageId: uuid('Stage') },
    annotations: { ...WRITE, idempotentHint: true },
  },
  ({ dealId, stageId }) => run(() => api.put(`/deals/${dealId}/stage`, { stageId })),
);

await server.connect(new StdioServerTransport());
console.error(`wazelo-mcp: connected to ${apiUrl}`);
