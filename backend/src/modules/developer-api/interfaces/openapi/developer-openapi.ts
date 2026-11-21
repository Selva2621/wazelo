/**
 * OpenAPI 3.0 description of the Developer API (the X-API-Key endpoints in
 * DeveloperApiController). Hand-written; developer-openapi.spec.ts fails if a
 * controller route is missing here, so keep both in step.
 */

const E164 = '^\\+?[1-9]\\d{6,14}$';

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'CONVERTED', 'CLOSED'];

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

/** Success responses are wrapped by the global TransformInterceptor. */
const ok = (description: string, data: Record<string, unknown>) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          data,
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
});

const errors = {
  400: { $ref: '#/components/responses/ValidationError' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  429: { $ref: '#/components/responses/RateLimited' },
};

const idParam = (name: string) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `${name} ID`,
  schema: { type: 'string', format: 'uuid' },
});

const cursorParams = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
  { name: 'cursor', in: 'query', description: 'nextCursor from the previous page', schema: { type: 'string' } },
];

const page = (item: string) => ({
  type: 'object',
  properties: {
    data: { type: 'array', items: ref(item) },
    nextCursor: { type: 'string', nullable: true },
    hasMore: { type: 'boolean' },
  },
});

const idempotencyHeader = {
  name: 'Idempotency-Key',
  in: 'header',
  required: false,
  description: 'Same key twice returns the first message instead of sending again (same as the idempotencyKey body field)',
  schema: { type: 'string', maxLength: 255 },
};

const body = (schema: unknown) => ({
  required: true,
  content: { 'application/json': { schema } },
});

/** Scopes each endpoint needs, also stated in its description. */
const scopes = (...s: string[]) => ({ 'x-required-scopes': s });

export function buildDeveloperOpenApiSpec(serverUrl: string) {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Wazelo Developer API',
      version: '1.0.0',
      description: [
        'Send WhatsApp messages and manage contacts from your own app.',
        '',
        'Authenticate with the `X-API-Key` header. A key needs `read` for GET requests,',
        '`write` for everything else, plus the resource scope listed on each endpoint',
        '(`messages` or `contacts`). Requests are limited to 60 per minute per key;',
        'see the `X-RateLimit-*` response headers.',
      ].join('\n'),
    },
    servers: [{ url: `${serverUrl}/api/v1` }],
    security: [{ ApiKey: [] }],
    tags: [
      { name: 'Messages' },
      { name: 'Templates' },
      { name: 'Contacts' },
      { name: 'Conversations' },
      { name: 'Deals' },
      { name: 'Session' },
      { name: 'API keys' },
    ],
    paths: {
      '/developer/messages/send': {
        post: {
          tags: ['Messages'],
          summary: 'Send a message',
          parameters: [idempotencyHeader],
          description: 'Text, media or interactive message. Scopes: write, messages.',
          ...scopes('write', 'messages'),
          requestBody: body(ref('SendMessageRequest')),
          responses: {
            200: ok('Queued for sending', {
              type: 'object',
              properties: { message: ref('SentMessage'), deduplicated: { type: 'boolean' } },
            }),
            ...errors,
          },
        },
      },
      '/developer/messages/send-bulk': {
        post: {
          tags: ['Messages'],
          summary: 'Send one message to many numbers',
          description: 'Up to 100 recipients. Scopes: write, messages.',
          ...scopes('write', 'messages'),
          requestBody: body(ref('SendBulkRequest')),
          responses: { 200: ok('Queued for sending', { type: 'object' }), ...errors },
        },
      },
      '/developer/messages/send-template': {
        post: {
          tags: ['Messages'],
          summary: 'Send a saved template',
          parameters: [idempotencyHeader],
          description: 'Fills `{{variables}}` in the template body. Scopes: write, messages.',
          ...scopes('write', 'messages'),
          requestBody: body(ref('SendTemplateRequest')),
          responses: {
            200: ok('Queued for sending', {
              type: 'object',
              properties: { message: ref('SentMessage'), deduplicated: { type: 'boolean' } },
            }),
            ...errors,
          },
        },
      },
      '/developer/messages': {
        get: {
          tags: ['Messages'],
          summary: 'List messages',
          description: 'Newest first, cursor pagination. Scopes: read, messages.',
          ...scopes('read', 'messages'),
          parameters: [
            ...cursorParams,
            { name: 'direction', in: 'query', schema: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] } },
            {
              name: 'status',
              in: 'query',
              schema: { type: 'string', enum: ['QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED'] },
            },
          ],
          responses: { 200: ok('A page of messages', page('Message')), ...errors },
        },
      },
      '/developer/messages/{id}': {
        get: {
          tags: ['Messages'],
          summary: 'Get a message',
          description: 'Includes its status events. Scopes: read, messages.',
          ...scopes('read', 'messages'),
          parameters: [idParam('Message')],
          responses: {
            200: ok('The message', ref('Message')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/templates': {
        get: {
          tags: ['Templates'],
          summary: 'List templates',
          description: 'Scopes: read, messages.',
          ...scopes('read', 'messages'),
          responses: { 200: ok('Templates', { type: 'array', items: ref('Template') }), ...errors },
        },
        post: {
          tags: ['Templates'],
          summary: 'Create or update a template',
          description: 'Matched by name. Scopes: write, messages.',
          ...scopes('write', 'messages'),
          requestBody: body(ref('CreateTemplateRequest')),
          responses: { 201: ok('The template', ref('Template')), ...errors },
        },
      },
      '/developer/contacts': {
        get: {
          tags: ['Contacts'],
          summary: 'List or search contacts',
          description: 'Newest first, cursor pagination. Scopes: read, contacts.',
          ...scopes('read', 'contacts'),
          parameters: [
            ...cursorParams,
            { name: 'search', in: 'query', description: 'Part of a name, phone or email', schema: { type: 'string', maxLength: 100 } },
            { name: 'phone', in: 'query', description: 'Exact phone number', schema: { type: 'string', pattern: E164 } },
            { name: 'leadStatus', in: 'query', schema: { type: 'string', enum: LEAD_STATUSES } },
          ],
          responses: { 200: ok('A page of contacts', page('Contact')), ...errors },
        },
        post: {
          tags: ['Contacts'],
          summary: 'Create a contact',
          description:
            'If a contact with this phone already exists it is returned with `created: false`. Scopes: write, contacts.',
          ...scopes('write', 'contacts'),
          requestBody: body(ref('CreateContactRequest')),
          responses: {
            201: ok('The contact', {
              type: 'object',
              properties: { contact: ref('Contact'), created: { type: 'boolean' } },
            }),
            ...errors,
          },
        },
      },
      '/developer/contacts/{id}': {
        get: {
          tags: ['Contacts'],
          summary: 'Get a contact',
          description: 'Scopes: read, contacts.',
          ...scopes('read', 'contacts'),
          parameters: [idParam('Contact')],
          responses: {
            200: ok('The contact', ref('Contact')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
        put: {
          tags: ['Contacts'],
          summary: 'Update a contact',
          description: 'Scopes: write, contacts.',
          ...scopes('write', 'contacts'),
          parameters: [idParam('Contact')],
          requestBody: body(ref('UpdateContactRequest')),
          responses: {
            200: ok('The updated contact', ref('Contact')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/contacts/{id}/lead-status': {
        put: {
          tags: ['Contacts'],
          summary: "Change a contact's lead status",
          description: 'Runs the same automations as changing it in the app. Scopes: write, contacts.',
          ...scopes('write', 'contacts'),
          parameters: [idParam('Contact')],
          requestBody: body({
            type: 'object',
            required: ['status'],
            properties: {
              status: { type: 'string', enum: LEAD_STATUSES },
              reason: { type: 'string', maxLength: 500 },
            },
          }),
          responses: {
            200: ok('The updated contact', ref('Contact')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/contacts/{id}/notes': {
        get: {
          tags: ['Contacts'],
          summary: "List a contact's notes",
          description: 'Newest first. Scopes: read, contacts.',
          ...scopes('read', 'contacts'),
          parameters: [idParam('Contact'), cursorParams[0]],
          responses: {
            200: ok('Notes', { type: 'array', items: ref('Note') }),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
        post: {
          tags: ['Contacts'],
          summary: 'Add a note to a contact',
          description: "Written as the API key's creator. Scopes: write, contacts.",
          ...scopes('write', 'contacts'),
          parameters: [idParam('Contact')],
          requestBody: body({
            type: 'object',
            required: ['content'],
            properties: { content: { type: 'string', maxLength: 10000 } },
          }),
          responses: {
            201: ok('The note', ref('Note')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/contacts/{id}/tags': {
        post: {
          tags: ['Contacts'],
          summary: 'Tag a contact',
          description: 'Creates the tag if it does not exist yet. Scopes: write, contacts.',
          ...scopes('write', 'contacts'),
          parameters: [idParam('Contact')],
          requestBody: body({
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', maxLength: 100, example: 'vip' },
              color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
            },
          }),
          responses: {
            200: ok('The tag', ref('Tag')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/contacts/{id}/tags/{tagId}': {
        delete: {
          tags: ['Contacts'],
          summary: 'Remove a tag from a contact',
          description: 'Scopes: write, contacts.',
          ...scopes('write', 'contacts'),
          parameters: [
            idParam('Contact'),
            { name: 'tagId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: ok('Removed', { type: 'object', properties: { removed: { type: 'boolean' } } }),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/tags': {
        get: {
          tags: ['Contacts'],
          summary: 'List tags',
          description: 'Scopes: read, contacts.',
          ...scopes('read', 'contacts'),
          responses: { 200: ok('Tags', { type: 'array', items: ref('Tag') }), ...errors },
        },
      },
      '/developer/conversations': {
        get: {
          tags: ['Conversations'],
          summary: 'List conversations',
          description: 'Most recent activity first, cursor pagination. Scopes: read, messages.',
          ...scopes('read', 'messages'),
          parameters: [
            ...cursorParams,
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'CLOSED', 'ARCHIVED'] } },
            { name: 'contactPhone', in: 'query', schema: { type: 'string', pattern: E164 } },
            { name: 'contactId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          ],
          responses: { 200: ok('A page of conversations', page('Conversation')), ...errors },
        },
      },
      '/developer/conversations/{id}/messages': {
        get: {
          tags: ['Conversations'],
          summary: 'Messages in a conversation',
          description: 'Newest first, cursor pagination. Scopes: read, messages.',
          ...scopes('read', 'messages'),
          parameters: [idParam('Conversation'), ...cursorParams],
          responses: {
            200: ok('A page of messages', page('Message')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/pipelines': {
        get: {
          tags: ['Deals'],
          summary: 'List pipelines and their stages',
          description: 'Scopes: read, contacts.',
          ...scopes('read', 'contacts'),
          responses: { 200: ok('Pipelines', { type: 'array', items: ref('Pipeline') }), ...errors },
        },
      },
      '/developer/deals': {
        get: {
          tags: ['Deals'],
          summary: 'List deals',
          description: 'Recently updated first, cursor pagination. Scopes: read, contacts.',
          ...scopes('read', 'contacts'),
          parameters: [
            ...cursorParams,
            { name: 'contactId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'pipelineId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'stageId', in: 'query', schema: { type: 'string', format: 'uuid' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['OPEN', 'WON', 'LOST'] } },
          ],
          responses: { 200: ok('A page of deals', page('Deal')), ...errors },
        },
      },
      '/developer/deals/{id}': {
        get: {
          tags: ['Deals'],
          summary: 'Get a deal',
          description: 'Includes notes and the follow-up note. Scopes: read, contacts.',
          ...scopes('read', 'contacts'),
          parameters: [idParam('Deal')],
          responses: {
            200: ok('The deal', ref('Deal')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/deals/{id}/stage': {
        put: {
          tags: ['Deals'],
          summary: 'Move a deal to another stage',
          description:
            "The stage must be in the deal's pipeline. Moving to a won or lost stage marks the deal won or lost, the same as dragging it on the board. Scopes: write, contacts.",
          ...scopes('write', 'contacts'),
          parameters: [idParam('Deal')],
          requestBody: body({
            type: 'object',
            required: ['stageId'],
            properties: { stageId: { type: 'string', format: 'uuid' } },
          }),
          responses: {
            200: ok('The moved deal', ref('Deal')),
            404: { $ref: '#/components/responses/NotFound' },
            ...errors,
          },
        },
      },
      '/developer/session/status': {
        get: {
          tags: ['Session'],
          summary: 'WhatsApp connection status',
          description: 'Scopes: read.',
          ...scopes('read'),
          responses: {
            200: ok('Connection status', {
              type: 'object',
              properties: {
                connected: { type: 'boolean' },
                sessions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      phoneNumber: { type: 'string', nullable: true },
                      status: { type: 'string' },
                      lastActiveAt: { type: 'string', format: 'date-time', nullable: true },
                    },
                  },
                },
              },
            }),
            ...errors,
          },
        },
      },
      '/developer/keys': {
        get: {
          tags: ['API keys'],
          summary: "List your organization's API keys",
          description: 'Keys are created in Settings, not through the API. Scopes: read.',
          ...scopes('read'),
          responses: { 200: ok('API keys (without the secret)', { type: 'array', items: { type: 'object' } }), ...errors },
        },
      },
      '/developer/keys/{id}': {
        delete: {
          tags: ['API keys'],
          summary: 'Revoke an API key',
          description: 'Scopes: write.',
          ...scopes('write'),
          parameters: [idParam('API key')],
          responses: {
            200: ok('Revoked', { type: 'object', properties: { revoked: { type: 'boolean' } } }),
            ...errors,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      responses: {
        ValidationError: { description: 'Invalid request body or query', content: { 'application/json': { schema: ref('Error') } } },
        Unauthorized: { description: 'Missing, invalid or expired API key', content: { 'application/json': { schema: ref('Error') } } },
        Forbidden: {
          description: 'Key lacks a required scope, the API is not on your plan, or a usage limit was reached',
          content: { 'application/json': { schema: ref('Error') } },
        },
        NotFound: { description: 'Not found', content: { 'application/json': { schema: ref('Error') } } },
        RateLimited: { description: 'Too many requests; retry after the Retry-After header', content: { 'application/json': { schema: ref('Error') } } },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            statusCode: { type: 'integer' },
            message: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
            error: { type: 'string', description: 'Machine-readable code, e.g. USAGE_LIMIT_EXCEEDED' },
            traceId: { type: 'string' },
          },
        },
        SendMessageRequest: {
          type: 'object',
          required: ['to'],
          properties: {
            to: { type: 'string', pattern: E164, example: '+919876543210' },
            type: { type: 'string', enum: ['text', 'image', 'video', 'document', 'audio', 'interactive'], default: 'text' },
            body: { type: 'string', maxLength: 4096, example: 'Hello from Wazelo!' },
            mediaUrl: { type: 'string', format: 'uri', maxLength: 2048 },
            caption: { type: 'string', maxLength: 1024 },
            idempotencyKey: { type: 'string', maxLength: 255, description: 'Same key twice returns the first message instead of sending again' },
            userId: { type: 'string', format: 'uuid', description: "Send from this team member's WhatsApp number" },
            interactive: ref('Interactive'),
          },
        },
        Interactive: {
          type: 'object',
          required: ['type', 'body'],
          properties: {
            type: { type: 'string', enum: ['button', 'list'] },
            header: { type: 'string' },
            body: { type: 'string' },
            footer: { type: 'string' },
            buttons: {
              type: 'array',
              items: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' } } },
            },
            buttonText: { type: 'string', description: 'Label of the list button' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  rows: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: { id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
        SendBulkRequest: {
          type: 'object',
          required: ['to'],
          properties: {
            to: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string', pattern: E164 } },
            type: { type: 'string', enum: ['text', 'image', 'video', 'document', 'audio'], default: 'text' },
            body: { type: 'string', maxLength: 4096 },
            mediaUrl: { type: 'string', format: 'uri' },
            caption: { type: 'string', maxLength: 1024 },
            userId: { type: 'string', format: 'uuid' },
          },
        },
        SendTemplateRequest: {
          type: 'object',
          required: ['to', 'templateName'],
          properties: {
            to: { type: 'string', pattern: E164 },
            templateName: { type: 'string' },
            languageCode: { type: 'string' },
            variables: { type: 'object', additionalProperties: { type: 'string' }, example: { name: 'Priya' } },
            idempotencyKey: { type: 'string', maxLength: 255 },
          },
        },
        CreateTemplateRequest: {
          type: 'object',
          required: ['name', 'body'],
          properties: {
            name: { type: 'string', maxLength: 255 },
            body: { type: 'string', maxLength: 4096, example: 'Hi {{name}}, your order is ready.' },
            language: { type: 'string', maxLength: 10 },
            category: { type: 'string', maxLength: 50 },
          },
        },
        CreateContactRequest: {
          type: 'object',
          required: ['name', 'phone'],
          properties: {
            name: { type: 'string', maxLength: 255 },
            phone: { type: 'string', pattern: E164 },
            email: { type: 'string', maxLength: 320 },
            metadata: { type: 'object', additionalProperties: true },
          },
        },
        UpdateContactRequest: {
          type: 'object',
          properties: {
            name: { type: 'string', maxLength: 255 },
            email: { type: 'string', maxLength: 320 },
            metadata: { type: 'object', additionalProperties: true },
          },
        },
        SentMessage: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            to: { type: 'string' },
            type: { type: 'string' },
            status: { type: 'string', example: 'QUEUED' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] },
            type: { type: 'string' },
            status: { type: 'string' },
            body: { type: 'string', nullable: true },
            mediaUrl: { type: 'string', nullable: true },
            contactPhone: { type: 'string' },
            whatsappMessageId: { type: 'string', nullable: true },
            idempotencyKey: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            events: {
              type: 'array',
              description: 'Only on GET /developer/messages/{id}',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        Template: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            body: { type: 'string' },
            language: { type: 'string' },
            category: { type: 'string' },
          },
        },
        Contact: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            phoneNumber: { type: 'string' },
            email: { type: 'string', nullable: true },
            leadStatus: { type: 'string', enum: LEAD_STATUSES },
            source: { type: 'string' },
            leadScore: { type: 'integer', description: 'Only on single-contact responses' },
            optedOut: { type: 'boolean', description: 'Only on single-contact responses' },
            owner: {
              type: 'object',
              description: 'Only on single-contact responses',
              properties: { id: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' } },
            },
            tags: { type: 'array', items: ref('Tag'), description: 'Only on single-contact responses' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Tag: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            color: { type: 'string', nullable: true },
          },
        },
        Note: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            content: { type: 'string' },
            authorId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Conversation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            contactId: { type: 'string', format: 'uuid', nullable: true },
            contactPhone: { type: 'string' },
            channelType: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['OPEN', 'CLOSED', 'ARCHIVED'] },
            lastMessageAt: { type: 'string', format: 'date-time', nullable: true },
            lastMessageBody: { type: 'string', nullable: true },
            unreadCount: { type: 'integer' },
            assignedToId: { type: 'string', format: 'uuid', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Pipeline: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            isDefault: { type: 'boolean' },
            stages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  order: { type: 'integer' },
                  isWonStage: { type: 'boolean' },
                  isLostStage: { type: 'boolean' },
                },
              },
            },
          },
        },
        Deal: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string' },
            value: { type: 'number', nullable: true },
            currency: { type: 'string' },
            status: { type: 'string', enum: ['OPEN', 'WON', 'LOST'] },
            expectedClose: { type: 'string', format: 'date-time', nullable: true },
            closedAt: { type: 'string', format: 'date-time', nullable: true },
            nextFollowUpAt: { type: 'string', format: 'date-time', nullable: true },
            assignedToId: { type: 'string', format: 'uuid', nullable: true },
            pipeline: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
            stage: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } } },
            contact: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' }, phoneNumber: { type: 'string' } },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  };
}
