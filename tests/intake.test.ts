import test from 'node:test'
import assert from 'node:assert/strict'
import { safeName, isGenericName, parseDraft, stripHtml } from '../src/lib/intake.ts'

test('safe names are lower-case, stamped and free of unsafe characters', () => {
  const n = safeName('Q3 Report – Final (v2).PDF', new Date('2026-10-25T10:30:05Z'))
  assert.equal(n, '20261025-103005-q3-report-final-v2.pdf')
  assert.match(safeName('../../etc/passwd'), /^\d{8}-\d{6}-passwd\.bin$/)
  assert.ok(safeName('é'.repeat(300) + '.txt').length < 130)
})
test('camera and scanner names are recognised as generic', () => {
  for (const n of ['IMG_1234.jpg', 'Screenshot 12.png', 'scan (3).pdf', 'untitled.txt']) assert.equal(isGenericName(n), true, n)
  assert.equal(isGenericName('pricing-policy.pdf'), false)
})
test('only a well-formed model draft is accepted', () => {
  const ok = parseDraft('Here you go: {"title":"Pricing policy","summary":"How prices are set and who may approve discounts.","tags":["Pricing","Policy"],"confidence":0.82}')
  assert.equal(ok?.confidence, 0.82)
  assert.deepEqual(ok?.tags, ['pricing', 'policy'])
  assert.equal(parseDraft('{"title":"x","summary":"short","confidence":0.9}'), null)
  assert.equal(parseDraft('{"title":"Fine title","summary":"A long enough summary for the check.","confidence":4}'), null)
  assert.equal(parseDraft('no json here'), null)
  assert.equal(parseDraft(null), null)
})
test('html is reduced to readable text', () => {
  assert.equal(stripHtml('<style>a{}</style><h1>Hi</h1><script>x()</script><p>there&nbsp;you</p>'), 'Hi there you')
})
