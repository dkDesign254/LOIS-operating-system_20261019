import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sourceLinks } from '../src/lib/sources.ts'

test('file sources become GitHub links', () => {
  const l = sourceLinks('strategy-systems-hub: supabase/functions/lucre-chat/index.ts')
  assert.equal(l[0].url, 'https://github.com/dkDesign254/strategy-systems-hub/blob/HEAD/supabase/functions/lucre-chat/index.ts')
})
test('several files split; topics link to the repository', () => {
  const l = sourceLinks('allwrite-press: ai-tools.functions.ts, docs/HANDOVER.md')
  assert.equal(l.length, 2)
  assert.ok(l[1].url?.endsWith('/docs/HANDOVER.md'))
  assert.equal(sourceLinks('agentops-competition: examples')[0].url, 'https://github.com/dkDesign254/agentops-competition_20260521')
  assert.equal(sourceLinks('agentops-competition: agentops SDK semantic conventions')[0].url, 'https://github.com/dkDesign254/agentops-competition_20260521')
})
test('unknown or empty sources never produce a link', () => {
  assert.equal(sourceLinks('somewhere: x/y.ts')[0].url, null)
  assert.deepEqual(sourceLinks(undefined), [])
  assert.equal(sourceLinks('nexusops-platform: ../../etc/passwd')[0].url, 'https://github.com/dkDesign254/nexusops-platform')
})
