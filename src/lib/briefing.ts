// Daily briefing: built only from counts and records in the person's own workspace.
// Every line carries the place it came from. No model is used, so nothing can be invented.

export type Prefs = { enabled: boolean; send_time: string; weekdays: number[]; weekend: 'off' | 'ask' | 'on'; voice: boolean }
export const DEFAULT_PREFS: Prefs = { enabled: true, send_time: '09:40', weekdays: [1, 2, 3, 4, 5], weekend: 'off', voice: false }

// Nairobi is UTC+3 all year (no daylight saving).
export function nairobi(now = new Date()) {
  const t = new Date(now.getTime() + 3 * 3_600_000)
  const date = t.toISOString().slice(0, 10)
  const minutes = t.getUTCHours() * 60 + t.getUTCMinutes()
  const wd = t.getUTCDay() === 0 ? 7 : t.getUTCDay() // 1 = Monday … 7 = Sunday
  return { date, minutes, weekday: wd }
}
const toMinutes = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm)
  return m ? Math.min(23, +m[1]) * 60 + Math.min(59, +m[2]) : 9 * 60 + 40
}

export function scheduleState(p: Prefs, now = new Date()): 'due' | 'early' | 'ask_weekend' | 'off' {
  const n = nairobi(now)
  if (!p.enabled) return 'off'
  const weekend = n.weekday >= 6
  if (weekend) {
    if (p.weekend === 'off') return 'off'
    if (p.weekend === 'ask') return 'ask_weekend'
  } else if (!p.weekdays.includes(n.weekday)) return 'off'
  return n.minutes >= toMinutes(p.send_time) ? 'due' : 'early'
}

export type Facts = {
  name: string
  tone: string
  openHelp: number
  pendingBank: number
  flagged: number
  isReviewer: boolean
  notReady: { title: string; score: number; message?: string }[]
  trialDaysLeft: number | null
  accessPending: boolean
  newUpdates: number
}
export type Item = { text: string; href: string; source: string }
export type Briefing = { greeting: string; items: Item[]; actions: string[]; spoken: string; empty: boolean }

export function compose(f: Facts, now = new Date()): Briefing {
  const hour = Math.floor(nairobi(now).minutes / 60)
  const part = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const greeting = f.tone === 'short' || f.tone === 'direct' ? `${part}${f.name ? `, ${f.name}` : ''}.` : `${part}${f.name ? `, ${f.name}` : ''}. Here is where things stand.`
  const items: Item[] = []
  const actions: string[] = []
  const plural = (n: number, w: string) => `${n} ${n === 1 ? w : /[^aeiou]y$/.test(w) ? `${w.slice(0, -1)}ies` : `${w}s`}`

  if (f.openHelp > 0) {
    items.push({ text: `${plural(f.openHelp, 'question')} waiting for a person to answer.`, href: '/app/help', source: 'Get help' })
    if (f.isReviewer) actions.push(`Answer the ${plural(f.openHelp, 'open question')}. An answer can be promoted to the knowledge bank so the next person gets it instantly.`)
  }
  if (f.isReviewer && f.pendingBank > 0) {
    items.push({ text: `${plural(f.pendingBank, 'knowledge bank entry')} waiting for review${f.flagged ? `, ${f.flagged} flagged as low confidence` : ''}.`, href: '/app/bank', source: 'Knowledge bank' })
    actions.push(f.flagged ? `Start with the ${f.flagged} flagged ${f.flagged === 1 ? 'entry' : 'entries'}: they are the ones most likely to be wrong.` : 'Review the pending entries. Approved ones feed future answers.')
  }
  f.notReady.slice(0, 3).forEach((b) => {
    items.push({ text: `Your brief "${b.title}" scores ${b.score} of 100 and is not ready to decide.`, href: '/app/briefs', source: 'Decision briefs' })
    actions.push(`Close the gaps on "${b.title}" before it goes to the decision-maker.`)
  })
  if (f.accessPending) items.push({ text: 'Your team access request is waiting for a staff member.', href: '/app/access', source: 'Access' })
  if (f.trialDaysLeft !== null && f.trialDaysLeft <= 7) {
    items.push({ text: f.trialDaysLeft > 0 ? `Your sandbox trial ends in ${plural(f.trialDaysLeft, 'day')}.` : 'Your sandbox trial has ended.', href: '/app/sandbox', source: 'Sandbox' })
  }
  if (f.newUpdates > 0) items.push({ text: `${plural(f.newUpdates, 'new update')} from the LOIS team.`, href: '/app', source: 'Updates' })

  const empty = items.length === 0
  if (empty) items.push({ text: 'Nothing needs you right now. No open questions, no pending reviews, no briefs waiting.', href: '/app', source: 'Workspace' })

  const spoken = [greeting, ...items.map((i) => i.text), actions.length ? `Suggested next: ${actions[0]}` : ''].filter(Boolean).join(' ')
  return { greeting, items, actions, spoken, empty }
}
