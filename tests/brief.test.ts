import test from 'node:test'
import assert from 'node:assert/strict'
import { analyse, emptyBrief, parseBrief, daysLeft } from '../src/lib/brief.ts'

const now = new Date('2026-10-27T10:00:00Z')
test('empty brief is not ready and says why', () => {
  const r = analyse(emptyBrief(), now)
  assert.equal(r.verdict, 'not_ready')
  assert.ok(r.gaps.length >= 3)
})
test('complete brief is ready', () => {
  const r = analyse({
    decision: 'Hire a freelance designer for Q1', decider: 'Dustine', deadline: '2026-11-05', stakes: 'low', reversibility: 'easy',
    options: [{ name: 'Hire', upside: 'faster launch', downside: 'costs KES 80,000' }, { name: 'Wait', upside: 'saves cash', downside: 'launch slips' }],
    evidence: ['numbers'], unknowns: '',
  }, now)
  assert.equal(r.verdict, 'ready')
  assert.ok(r.score >= 75)
})
test('irreversible decision with little evidence cannot be ready', () => {
  const r = analyse({ ...emptyBrief(), decision: 'Sign the two year lease', decider: 'A', deadline: '2026-11-05', reversibility: 'none', evidence: ['numbers'],
    options: [{ name: 'Sign', upside: 'x', downside: 'y' }, { name: 'Walk', upside: 'x', downside: 'y' }] }, now)
  assert.notEqual(r.verdict, 'ready')
  assert.match(r.approvers, /second person/)
})
test('past deadline is flagged', () => {
  assert.equal(daysLeft('2026-10-20', now), -7)
  const r = analyse({ ...emptyBrief(), decision: 'Choose a supplier today', deadline: '2026-10-20' }, now)
  assert.ok(r.gaps.some((g) => g.includes('passed')))
})
test('parseBrief rejects junk and clamps lengths', () => {
  assert.equal(parseBrief(null), null)
  const b = parseBrief({ decision: 'x'.repeat(999), stakes: 'weird', options: 'no', evidence: [1, 'numbers'] })!
  assert.equal(b.decision.length, 200)
  assert.equal(b.stakes, 'medium')
  assert.deepEqual(b.evidence, ['numbers'])
  assert.equal(b.options.length, 2)
})
