import { json } from '../_lib'

export const dynamic = 'force-static'

const keyAuth = [{ bearer: [] }, { apiKey: [] }]
const err = { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }

export async function GET() {
  return json({
    openapi: '3.1.0',
    info: {
      title: 'LOIS Knowledge Layer API',
      version: '1.0.0',
      description:
        'Search approved knowledge and submit candidate entries for review. Compatibility promise: v1 only gains new optional request fields and new response fields. Clients must ignore unknown response fields. Breaking changes ship as /api/v2 and v1 keeps working.',
    },
    servers: [{ url: '/api/v1' }],
    paths: {
      '/health': { get: { summary: 'Service status (no key needed)', responses: { '200': { description: 'OK' } } } },
      '/search': {
        post: {
          summary: 'Search approved knowledge',
          security: keyAuth,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { query: { type: 'string', maxLength: 400, description: 'Alias: q' }, limit: { type: 'integer', minimum: 1, maximum: 20, default: 8 } }, required: ['query'] } } },
          },
          responses: { '200': { description: 'Ranked, cited passages', content: { 'application/json': { schema: { $ref: '#/components/schemas/SearchResponse' } } } }, '401': err, '403': err, '429': err },
        },
        get: {
          summary: 'Search (query string form: ?query=...&limit=...)',
          security: keyAuth,
          responses: { '200': { description: 'Same as POST' }, '401': err, '429': err },
        },
      },
      '/knowledge': {
        post: {
          summary: 'Submit a candidate entry for review (needs write scope)',
          security: keyAuth,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, content: { type: 'string' }, domain: { type: 'string', default: 'general' }, source: { type: 'string' }, label: { enum: ['verified', 'reported', 'example'], default: 'reported' } }, required: ['title', 'content'] } } },
          },
          responses: { '201': { description: 'Queued as pending_review' }, '400': err, '401': err, '403': err, '429': err },
        },
      },
    },
    components: {
      securitySchemes: { bearer: { type: 'http', scheme: 'bearer' }, apiKey: { type: 'apiKey', in: 'header', name: 'X-API-Key' } },
      schemas: {
        Error: { type: 'object', properties: { api_version: { type: 'string' }, error: { type: 'object', properties: { code: { type: 'string' }, message: { type: 'string' } } } } },
        SearchResponse: {
          type: 'object',
          properties: {
            api_version: { type: 'string' },
            query: { type: 'string' },
            count: { type: 'integer' },
            results: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  kind: { enum: ['knowledge_bank', 'document'] },
                  title: { type: 'string' },
                  snippet: { type: 'string' },
                  evidence_label: { enum: ['verified', 'reported', 'example'] },
                  score: { type: 'number' },
                  version: { type: ['integer', 'null'] },
                  updated_at: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    'x-webhooks': {
      description: 'Signed POSTs. Header LOIS-Signature: t=<unix>,v1=<hex HMAC-SHA256 of "<t>.<raw body>" with your signing secret>. Header LOIS-Event names the event.',
      events: ['knowledge.approved', 'knowledge.rejected', 'help.resolved', 'document.added'],
      envelope: { id: 'uuid', api_version: '1', type: 'event name', created: 'unix seconds', tenant_id: 'uuid', data: 'event specific object' },
    },
  })
}
