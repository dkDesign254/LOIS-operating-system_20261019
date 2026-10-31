import { test } from 'node:test'
import assert from 'node:assert/strict'
import { webResearch } from '../src/lib/research.ts'

const ok = { candidates: [{ content: { parts: [{ text: 'Answer' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://example.com/a', title: 'A' } }, { web: { uri: 'http://bad.example/x', title: 'B' } }], webSearchQueries: ['q'] } }] }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } })

test('falls back when a model name is retired (404) and keeps only https sources', async () => {
  process.env.GOOGLE_API_KEY = 'k'; process.env.LOIS_MODEL_GOOGLE = 'retired-model'
  const seen: string[] = []
  globalThis.fetch = (async (u: string) => { seen.push(String(u)); return String(u).includes('retired-model') || String(u).includes('gemini-flash-latest') ? json({}, 404) : json(ok) }) as typeof fetch
  const r = await webResearch('q')
  assert.equal(r.model, 'gemini-2.5-flash'); assert.equal(r.sources.length, 1); assert.ok(seen.length >= 3)
})
test('asks Google which models exist when every known name is 404', async () => {
  process.env.GOOGLE_API_KEY = 'k'; delete process.env.LOIS_MODEL_GOOGLE
  globalThis.fetch = (async (u: string) => {
    const x = String(u)
    if (x.endsWith('/models?pageSize=200')) return json({ models: [{ name: 'models/gemini-9-flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/gemini-9-flash-lite', supportedGenerationMethods: ['generateContent'] }] })
    return x.includes('gemini-9-flash:') ? json(ok) : json({}, 404)
  }) as typeof fetch
  assert.equal((await webResearch('q')).model, 'gemini-9-flash')
})
test('a real failure (403) is reported as such, not retried as a model problem', async () => {
  process.env.GOOGLE_API_KEY = 'k'
  globalThis.fetch = (async () => json({}, 403)) as typeof fetch
  await assert.rejects(() => webResearch('q'), /403/)
})
