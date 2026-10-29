import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseLayout, suggest, sectionOf, DEFAULT_LAYOUT, type Signals } from '../src/lib/rail.ts'

const base: Signals = { isReviewer: false, pendingReview: 0, openHelp: 0, trialDaysLeft: null, trialEnded: false, briefingReady: false, newUpdates: 0, hasBrief: true }

test('layout parsing repairs junk and keeps every card', () => {
  const l = parseLayout({ order: ['today', 'nope', 'today'], hidden: ['updates', 7], wide: 'yes' })
  assert.deepEqual(l.order, ['today', 'foryou', 'updates'])
  assert.deepEqual(l.hidden, ['updates'])
  assert.equal(l.wide, false)
  assert.equal(l.open, true)
  assert.deepEqual(parseLayout(null), DEFAULT_LAYOUT)
})
test('sections are named from the address', () => {
  assert.equal(sectionOf('/app'), 'ask')
  assert.equal(sectionOf('/app/bank/review'), 'bank')
})
test('reviewers see the queue first; others never do', () => {
  const r = suggest({ ...base, isReviewer: true, pendingReview: 69, briefingReady: true }, {}, {}, {}, '2026-10-29')
  assert.equal(r[0].id, 'review')
  assert.ok(!suggest({ ...base, pendingReview: 69 }, {}, {}, {}, '2026-10-29').some((s) => s.id === 'review'))
})
test('dismissed suggestions stay away; reviews return the next day', () => {
  const sig = { ...base, isReviewer: true, pendingReview: 3, openHelp: 2 }
  const d = suggest(sig, {}, { help: '2026-10-28', review: '2026-10-28' }, {}, '2026-10-29')
  assert.ok(!d.some((s) => s.id === 'help'))
  assert.ok(d.some((s) => s.id === 'review'))
})
test('learns: heavy use lifts a section, "not useful" votes lower a kind', () => {
  const usage = { briefing: { n: 40, last: '2026-10-29' } }
  const a = suggest({ ...base, briefingReady: true, openHelp: 1 }, usage, {}, {}, '2026-10-29')
  assert.equal(a[0].id, 'briefing')
  const b = suggest({ ...base, briefingReady: true, openHelp: 1 }, usage, {}, { briefing: { down: 6 } }, '2026-10-29')
  assert.equal(b[0].id, 'help')
})
test('never more than three', () => {
  const r = suggest({ ...base, isReviewer: true, pendingReview: 1, openHelp: 1, briefingReady: true, newUpdates: 2, hasBrief: false }, {}, {}, {}, '2026-10-29')
  assert.equal(r.length, 3)
})
