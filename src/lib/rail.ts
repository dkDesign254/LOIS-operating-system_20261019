// The personal right-hand panel: layout, what LOIS has learned from use, and what it suggests next.
// Learning is plain counting, not a model: visits per section, suggestions you dismiss or follow. Nothing leaves your account.

export const CARDS = ['foryou', 'today', 'updates'] as const
export type CardId = (typeof CARDS)[number]
export const CARD_LABEL: Record<CardId, string> = { foryou: 'For you', today: 'Today', updates: 'Updates' }

export type RailLayout = { order: CardId[]; hidden: CardId[]; collapsed: CardId[]; wide: boolean; open: boolean }
export const DEFAULT_LAYOUT: RailLayout = { order: [...CARDS], hidden: [], collapsed: [], wide: false, open: true }

const isCard = (x: unknown): x is CardId => typeof x === 'string' && (CARDS as readonly string[]).includes(x)
const uniq = <T,>(a: T[]) => Array.from(new Set(a))

export function parseLayout(raw: unknown): RailLayout {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const list = (v: unknown) => (Array.isArray(v) ? uniq(v.filter(isCard)) : [])
  const order = list(r.order)
  for (const c of CARDS) if (!order.includes(c)) order.push(c)
  return { order, hidden: list(r.hidden), collapsed: list(r.collapsed), wide: r.wide === true, open: r.open !== false }
}

export type Usage = Record<string, { n: number; last: string }>
export type Feedback = Record<string, { up?: number; down?: number }>
export type Dismissed = Record<string, string>

export const SECTION_LABEL: Record<string, string> = {
  ask: 'Ask LOIS', bank: 'Knowledge bank', briefing: 'Daily briefing', briefs: 'Decision briefs', knowledge: 'Knowledge base', help: 'Get help',
  sandbox: 'Sandbox', readiness: 'Agent readiness', projects: 'Projects', intake: 'Intake', learn: 'Learn LOIS', control: 'Start here', decisions: 'Decisions',
}

/** Maps a page address to the section name the panel counts visits under. */
export function sectionOf(pathname: string): string {
  const seg = pathname.replace(/^\/app\/?/, '').split('/')[0]
  return !seg ? 'ask' : seg.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) || 'ask'
}

export type Signals = {
  isReviewer: boolean
  pendingReview: number
  openHelp: number
  trialDaysLeft: number | null
  trialEnded: boolean
  briefingReady: boolean
  newUpdates: number
  hasBrief: boolean
}
export type Suggestion = { id: string; kind: string; text: string; href: string; why: string; score: number }

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5)

/** Ranks what to show: urgency first, then what this person actually uses, minus what they said was not useful. */
export function suggest(sig: Signals, usage: Usage, dismissed: Dismissed, feedback: Feedback, today: string, max = 3): Suggestion[] {
  const affinity = (s: string) => Math.min(2, Math.log2(1 + (usage[s]?.n ?? 0)) * 0.4)
  const c: Suggestion[] = []
  const add = (id: string, kind: string, base: number, text: string, href: string, section: string, why: string) =>
    c.push({ id, kind, text, href, why, score: base + affinity(section) })

  if (sig.isReviewer && sig.pendingReview > 0)
    add('review', 'review', 5, `${sig.pendingReview} knowledge entr${sig.pendingReview === 1 ? 'y is' : 'ies are'} waiting for your decision.`, '/app/bank/review', 'bank', 'You are a reviewer and the queue is not empty.')
  if (sig.trialEnded) add('trial-end', 'trial', 6, 'Your sandbox trial has ended. You can still read and export your data.', '/app/privacy', 'privacy', 'The trial clock ran out.')
  else if (sig.trialDaysLeft != null && sig.trialDaysLeft <= 7)
    add('trial-soon', 'trial', 4.5, `Your sandbox trial ends in ${sig.trialDaysLeft} day${sig.trialDaysLeft === 1 ? '' : 's'}. Export anything you want to keep.`, '/app/privacy', 'privacy', 'The trial is almost over.')
  if (sig.openHelp > 0) add('help', 'help', 3, `${sig.openHelp} help request${sig.openHelp === 1 ? ' is' : 's are'} still open.`, '/app/help', 'help', 'Open requests slow people down.')
  if (sig.briefingReady) add('briefing', 'briefing', 2, 'Your daily briefing is ready.', '/app/briefing', 'briefing', 'Prepared after your chosen time today.')
  if (sig.newUpdates > 0) add('updates', 'updates', 1.2, `${sig.newUpdates} new update${sig.newUpdates === 1 ? '' : 's'} from the LOIS team.`, '/app/briefing', 'briefing', 'Posted in the last 3 days.')
  if (!sig.hasBrief) add('first-brief', 'explore', 1.5, 'Turn one open decision into a one-page brief.', '/app/briefs', 'briefs', 'You have not saved a Decision Brief yet.')

  const top = Object.entries(usage).filter(([s]) => SECTION_LABEL[s]).sort((a, b) => b[1].n - a[1].n)[0]
  if (top && top[1].n >= 3) add('habit-' + top[0], 'habit', 1, `Pick up in ${SECTION_LABEL[top[0]]}, where you spend most time.`, top[0] === 'ask' ? '/app' : '/app/' + top[0], top[0], `You have opened it ${top[1].n} times.`)
  const untried = (['sandbox', 'readiness', 'learn'] as const).find((s) => !usage[s])
  if (untried && Object.values(usage).reduce((n, u) => n + u.n, 0) >= 5)
    add('try-' + untried, 'explore', 0.9, `You have not opened ${SECTION_LABEL[untried]} yet.`, '/app/' + untried, untried, 'Suggested because you have used other parts of LOIS but not this one.')

  return c
    .filter((s) => {
      const d = dismissed[s.id]
      return !d || daysBetween(d, today) >= (s.kind === 'review' || s.kind === 'trial' ? 1 : 7)
    })
    .map((s) => {
      const f = feedback[s.kind]
      return { ...s, score: s.score + Math.min(1, (f?.up ?? 0) * 0.2) - Math.min(2, (f?.down ?? 0) * 0.5) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
}
