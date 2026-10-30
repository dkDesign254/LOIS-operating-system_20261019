import { test } from 'node:test'
import assert from 'node:assert/strict'
import { USE_CASES, bySlug } from '../src/lib/use-cases.ts'
import { buildRecord, simulate } from '../src/lib/run-record.ts'
import { pickFrameworks, FRAMEWORKS } from '../src/lib/frameworks.ts'

test('every use case has a person-decision step before anything leaves LOIS', () => {
  for (const u of USE_CASES) {
    const firstOut = u.steps.findIndex((s) => s.outward)
    const approve = u.steps.findIndex((s) => s.kind === 'person')
    assert.ok(approve >= 0 && (firstOut < 0 || approve < firstOut), u.slug)
    for (const k of Object.keys(u.standard_config)) assert.ok(u.config_fields.some((f) => f.key === k), `${u.slug} ${k}`)
  }
})
test('a test run says nothing was sent and labels output as simulated', () => {
  const u = bySlug('social-media-management')!
  const r = buildRecord(u, 'test', 'standard', u.standard_config, { business: 'Demo Co' }, '')
  assert.equal(r.accuracy.level, 'simulated')
  assert.match(r.effects[0], /No outside system/)
  assert.ok(simulate(u, { business: 'Demo Co' }).every((s) => s.example.length > 10))
})
test('a live run lists what cannot be taken back and gets stronger frameworks', () => {
  const u = bySlug('orders-and-invoicing')!
  const r = buildRecord(u, 'live', 'custom', u.standard_config, {}, 'Real order')
  assert.ok(r.effects.some((e) => /cannot be taken back/.test(e)))
  const ids = r.frameworks.map((f) => f.id)
  assert.ok(ids.includes('doors') && ids.includes('premortem'))
  assert.ok(r.frameworks.length <= 5)
})
test('failed runs bring in five whys; all frameworks have questions', () => {
  assert.ok(pickFrameworks({ outward: false, reversible: true, mode: 'test', failed: true }).some((f) => f.id === 'fivewhys'))
  for (const f of Object.values(FRAMEWORKS)) assert.ok(f.ask.length >= 2 && f.lesson && f.origin)
})
