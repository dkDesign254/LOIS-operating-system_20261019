import test from 'node:test'
import assert from 'node:assert/strict'
import { chunkText } from '../src/lib/chunk.ts'
import { sha256, newApiKey, newSecret } from '../src/lib/hash.ts'
import { toVector } from '../src/lib/embed.ts'

test('chunkText keeps passages within the limit and loses no text', () => {
  const text = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ` + 'word '.repeat(60)).join('\n\n')
  const chunks = chunkText(text)
  assert.ok(chunks.length > 1)
  for (const c of chunks) assert.ok(c.length <= 1000, `chunk too long: ${c.length}`)
  assert.ok(chunks.join(' ').includes('Paragraph 39.'))
})

test('chunkText handles empty and single-line input', () => {
  assert.deepEqual(chunkText(''), [])
  assert.deepEqual(chunkText('Hello.'), ['Hello.'])
})

test('API keys are unique, prefixed, and only the hash is derivable', () => {
  const a = newApiKey()
  const b = newApiKey()
  assert.notEqual(a.key, b.key)
  assert.ok(a.key.startsWith('lois_live_'))
  assert.equal(a.hash, sha256(a.key))
  assert.equal(a.hash.length, 64)
  assert.ok(newSecret().startsWith('whsec_'))
})

test('toVector formats a pgvector literal', () => {
  assert.equal(toVector([1, 0.5, -2]), '[1,0.5,-2]')
})

import { readiness } from '../src/lib/readiness.ts'
const base = { risk: 'high', amount_kes: null, evidence_present: false, evidence_note: null, evidence_date: null, deadline: null, source_state: null, status: 'pending', requester: 'a@b.c' }

test('readiness gives five separate measures and no single score', () => {
  const ms = readiness(base, [], true)
  assert.equal(ms.length, 5)
  assert.deepEqual(ms.map((m) => m.key), ['coverage', 'freshness', 'reliability', 'unresolved', 'authority'])
})

test('high risk with no evidence is critical, and absent data is "Not assessed" not zero', () => {
  const ms = readiness(base, [], true)
  assert.equal(ms[0].status, 'crit')
  assert.equal(ms[1].status, 'none')
  assert.equal(ms[2].text, 'Not assessed')
  assert.equal(ms[3].text.includes('not challenged yet'), true)
})

test('freshness uses the 30 day rule and unresolved counts open challenge points', () => {
  const ok = readiness({ ...base, risk: 'low', evidence_present: true, evidence_date: '2026-10-01', deadline: '2026-10-20' }, [{ point: 'x', mark: 'unresolved' }], false)
  assert.equal(ok[1].status, 'ok')
  assert.equal(ok[3].status, 'warn')
  assert.equal(ok[4].status, 'warn')
})

import { validAnswers, recommend, friendlyAuthError } from '../src/lib/policy.ts'
test('assessment validates answers and recommends a start page', () => {
  assert.equal(validAnswers({ intent: 'decisions', audience: 'myself', org_type: 'startup' }), true)
  assert.equal(validAnswers({ intent: 'hack', audience: 'myself', org_type: 'startup' }), false)
  assert.equal(recommend({ intent: 'automation', audience: 'my_team', org_type: 'other' }).path, '/app/integrations')
})
test('auth errors become actionable messages', () => {
  assert.match(friendlyAuthError('Error sending confirmation email'), /could not send the email/)
  assert.match(friendlyAuthError('Invalid login credentials'), /do not match/)
})

import { classifyTask, nextSummary, buildContext, rank } from '../src/lib/models.ts'
test('tasks are classified by plain rules', () => {
  assert.equal(classifyTask('Write a warm email to a new client'), 'writing')
  assert.equal(classifyTask('Fix this SQL query'), 'code')
  assert.equal(classifyTask('Should we choose a quick fix or a proper fix and why'), 'reasoning')
  assert.equal(classifyTask('hi'), 'quick')
  assert.equal(classifyTask('x'.repeat(7000)), 'summarise')
})
test('with no keys nothing is routed and the shared summary stays bounded', () => {
  for (const k of ['ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'OPENROUTER_API_KEY']) delete process.env[k]
  assert.equal(rank('writing').length, 0)
  let s = ''
  for (let i = 0; i < 80; i++) s = nextSummary(s, 'question ' + i, 'm', 'answer '.repeat(60))
  assert.ok(s.length <= 3800)
  assert.match(s, /question 79/)
})
test('with keys the strongest model for the job ranks first and context is shared', () => {
  process.env.GOOGLE_API_KEY = 'x'
  process.env.GROQ_API_KEY = 'x'
  assert.equal(rank('summarise')[0].id, 'google')
  assert.equal(rank('quick')[0].id, 'groq')
  const c = buildContext({ summary: 'S', knowledge: 'K', history: [{ role: 'assistant', content: 'earlier', model: 'gemini' }] })
  assert.match(c, /Session so far/)
  assert.match(c, /Assistant \(gemini\)/)
})
