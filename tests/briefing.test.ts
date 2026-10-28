import test from 'node:test'
import assert from 'node:assert/strict'
import { scheduleState, nairobi, compose, DEFAULT_PREFS } from '../src/lib/briefing.ts'

// 2026-10-28 is a Wednesday. 06:40 UTC = 09:40 Nairobi.
test('Nairobi time and weekday', () => {
  const n = nairobi(new Date('2026-10-28T06:40:00Z'))
  assert.equal(n.minutes, 9 * 60 + 40)
  assert.equal(n.weekday, 3)
  assert.equal(nairobi(new Date('2026-10-28T21:30:00Z')).date, '2026-10-29') // after midnight in Nairobi
})
test('due from 09:40 on weekdays, early before', () => {
  assert.equal(scheduleState(DEFAULT_PREFS, new Date('2026-10-28T06:39:00Z')), 'early')
  assert.equal(scheduleState(DEFAULT_PREFS, new Date('2026-10-28T06:40:00Z')), 'due')
})
test('weekend follows the person’s choice', () => {
  const sat = new Date('2026-10-31T08:00:00Z')
  assert.equal(scheduleState(DEFAULT_PREFS, sat), 'off')
  assert.equal(scheduleState({ ...DEFAULT_PREFS, weekend: 'ask' }, sat), 'ask_weekend')
  assert.equal(scheduleState({ ...DEFAULT_PREFS, weekend: 'on' }, sat), 'due')
})
test('disabled and custom time', () => {
  assert.equal(scheduleState({ ...DEFAULT_PREFS, enabled: false }, new Date('2026-10-28T08:00:00Z')), 'off')
  assert.equal(scheduleState({ ...DEFAULT_PREFS, send_time: '14:00' }, new Date('2026-10-28T08:00:00Z')), 'early')
})
test('compose states only what is in the facts', () => {
  const b = compose({ name: 'Dustine', tone: 'default', openHelp: 2, pendingBank: 69, flagged: 3, isReviewer: true, notReady: [{ title: 'Hire', score: 40 }], trialDaysLeft: 5, accessPending: false, newUpdates: 0 }, new Date('2026-10-28T06:40:00Z'))
  assert.match(b.items[0].text, /2 questions/)
  assert.ok(b.items.some((i) => i.text.includes('69 knowledge bank entries')))
  assert.ok(b.items.some((i) => i.text.includes('5 days')))
  assert.ok(!b.empty)
  assert.match(b.actions[1], /flagged/)
})
test('quiet day says so plainly; non-reviewers get no review actions', () => {
  const q = compose({ name: '', tone: 'short', openHelp: 0, pendingBank: 5, flagged: 0, isReviewer: false, notReady: [], trialDaysLeft: null, accessPending: false, newUpdates: 0 })
  assert.ok(q.empty)
  assert.equal(q.actions.length, 0)
})
