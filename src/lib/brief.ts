// Decision Brief: turns a rough decision into what a decision-maker needs. Rule-based and deterministic:
// it never invents facts, never calls a model, and only reflects what the person typed.

export type Option = { name: string; upside: string; downside: string }
export type BriefInput = {
  decision: string
  decider: string
  deadline: string // yyyy-mm-dd or ''
  stakes: 'low' | 'medium' | 'high'
  reversibility: 'easy' | 'hard' | 'none'
  options: Option[]
  evidence: string[] // keys of EVIDENCE
  unknowns: string // one per line
}
export type Measure = { key: 'question' | 'options' | 'evidence' | 'approval'; label: string; score: number; why: string }
export type BriefResult = {
  score: number
  verdict: 'ready' | 'nearly' | 'not_ready'
  verdictText: string
  measures: Measure[]
  gaps: string[]
  questions: string[]
  tripwires: string[]
  approvers: string
  actions: string[]
  message: string
}

export const EVIDENCE: { key: string; label: string }[] = [
  { key: 'numbers', label: 'Numbers (costs, sales, usage)' },
  { key: 'people', label: 'What customers or users said' },
  { key: 'history', label: 'What happened last time' },
  { key: 'expert', label: 'Advice from someone who knows' },
  { key: 'written', label: 'A written source (contract, report, policy)' },
]

const clean = (s: string, n = 400) => s.replace(/\s+/g, ' ').trim().slice(0, n)
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

export function daysLeft(deadline: string, now = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) return null
  const d = new Date(`${deadline}T00:00:00Z`).getTime()
  if (Number.isNaN(d)) return null
  const t = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((d - t) / 86_400_000)
}

export function analyse(input: BriefInput, now = new Date()): BriefResult {
  const decision = clean(input.decision, 200)
  const decider = clean(input.decider, 80)
  const options = input.options.map((o) => ({ name: clean(o.name, 80), upside: clean(o.upside), downside: clean(o.downside) })).filter((o) => o.name)
  const evidence = input.evidence.filter((k) => EVIDENCE.some((e) => e.key === k))
  const unknowns = input.unknowns.split('\n').map((l) => clean(l, 200)).filter(Boolean).slice(0, 8)
  const left = daysLeft(input.deadline, now)

  const gaps: string[] = []
  const questions: string[] = []

  // 1. Is the question clear?
  let q = 0
  if (decision.length >= 10) q += 45
  else gaps.push('Say the decision in one line, starting with a verb (for example: "Hire a freelance designer for Q1").')
  if (decider) q += 30
  else gaps.push('Name the one person who decides. A decision without an owner stalls.')
  if (left !== null) q += 25
  else gaps.push('Add a date by which the decision has to be made.')
  if (left !== null && left < 0) gaps.push('The deadline has passed. Either decide now or set a new date and say why it moved.')

  // 2. Are the options real?
  let o = 0
  if (options.length >= 2) o += 40
  else gaps.push('List at least two options. "Do nothing" counts as one.')
  const full = options.filter((x) => x.upside && x.downside).length
  if (options.length) o += Math.round((full / Math.max(options.length, 2)) * 60)
  options.forEach((x) => {
    if (!x.downside) questions.push(`What is the main downside of "${x.name}"?`)
    if (!x.upside) questions.push(`What is the main upside of "${x.name}"?`)
  })

  // 3. How much evidence?
  const need = input.stakes === 'high' || input.reversibility === 'none' ? 3 : input.stakes === 'medium' ? 2 : 1
  const e = clamp((evidence.length / need) * 100)
  if (evidence.length < need) {
    const missing = EVIDENCE.filter((x) => !evidence.includes(x.key)).map((x) => x.label.toLowerCase())
    gaps.push(`This decision needs ${need} kind${need > 1 ? 's' : ''} of evidence and you have ${evidence.length}. Missing: ${missing.slice(0, 3).join('; ')}.`)
  }

  // 4. Ready for a person to approve?
  let a = clamp((q + o + e) / 3)
  if (unknowns.length) {
    a = clamp(a - Math.min(30, unknowns.length * 8))
    unknowns.forEach((u) => questions.push(`Can this be answered before the date: ${u.replace(/[.?]+$/, '')}?`))
  }
  if (input.reversibility === 'none' && evidence.length < 3) a = Math.min(a, 40)

  const measures: Measure[] = [
    { key: 'question', label: 'The question is clear', score: clamp(q), why: q >= 100 ? 'Decision, owner and date are all stated.' : 'Something about the question itself is missing.' },
    { key: 'options', label: 'The options are real', score: clamp(o), why: options.length >= 2 ? `${full} of ${options.length} options show both a gain and a cost.` : 'Fewer than two options.' },
    { key: 'evidence', label: 'The evidence fits the stakes', score: e, why: `${evidence.length} of ${need} needed kinds.` },
    { key: 'approval', label: 'Ready for a person to approve', score: a, why: unknowns.length ? `${unknowns.length} open unknown${unknowns.length > 1 ? 's' : ''} lower this.` : 'No open unknowns listed.' },
  ]
  const score = clamp(measures.reduce((s, m) => s + m.score, 0) / measures.length)
  const verdict: BriefResult['verdict'] = score >= 75 && a >= 60 ? 'ready' : score >= 50 ? 'nearly' : 'not_ready'
  const verdictText = { ready: 'Ready to put in front of the decision-maker.', nearly: 'Nearly there. Close the gaps below first.', not_ready: 'Not ready. Deciding now would be a guess.' }[verdict]

  const tripwires = options.filter((x) => x.downside).map((x) => `If ${x.downside.replace(/[.]+$/, '').toLowerCase()} turns out to be true, "${x.name}" should be dropped.`)
  if (!tripwires.length) tripwires.push('Write down, before deciding, what fact would make you change your mind.')

  const high = input.stakes === 'high' || input.reversibility === 'none'
  const approvers = high
    ? `${decider || 'The decision-maker'} decides, and a second person reviews the evidence first, because this is ${input.reversibility === 'none' ? 'not reversible' : 'high stakes'}.`
    : `${decider || 'The decision-maker'} can decide alone. Write the reason down so the decision can be reviewed later.`

  const actions: string[] = []
  gaps.slice(0, 2).forEach((g) => actions.push(g))
  if (unknowns[0]) actions.push(`Find out: ${unknowns[0]}`)
  if (verdict === 'ready') actions.push(`Send the summary to ${decider || 'the decision-maker'} and ask for a yes, no or "need more" by ${input.deadline || 'a set date'}.`)
  if (!actions.length) actions.push('Review the brief once more, then send it.')

  const optLines = options.map((x, i) => `  ${i + 1}. ${x.name}${x.upside ? ` (gain: ${x.upside})` : ''}${x.downside ? ` (cost: ${x.downside})` : ''}`).join('\n')
  const message = [
    `Hi ${decider || 'there'},`,
    '',
    `I need your decision on: ${decision || '[decision]'}${input.deadline ? ` by ${input.deadline}` : ''}.`,
    '',
    options.length ? `Options:\n${optLines}` : 'Options: still being drawn up.',
    '',
    `What we know: ${evidence.length ? evidence.map((k) => EVIDENCE.find((x) => x.key === k)!.label.toLowerCase()).join('; ') : 'nothing written down yet'}.`,
    unknowns.length ? `Still unknown: ${unknowns.join('; ')}.` : 'Nothing important is left unknown.',
    '',
    verdict === 'ready' ? 'Please reply yes, no, or tell me what else you need.' : 'This is not ready to decide. I will close the gaps and come back.',
  ].join('\n')

  return { score, verdict, verdictText, measures, gaps, questions: questions.slice(0, 8), tripwires, approvers, actions: actions.slice(0, 4), message }
}

export const emptyBrief = (): BriefInput => ({
  decision: '', decider: '', deadline: '', stakes: 'medium', reversibility: 'hard',
  options: [{ name: '', upside: '', downside: '' }, { name: '', upside: '', downside: '' }],
  evidence: [], unknowns: '',
})

// Validates a stored/imported brief so a tampered browser value cannot break the page or the database.
export function parseBrief(raw: unknown): BriefInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : '')
  const pick = <T extends string>(v: unknown, set: readonly T[], d: T): T => (typeof v === 'string' && (set as readonly string[]).includes(v) ? (v as T) : d)
  const opts = Array.isArray(r.options) ? r.options.slice(0, 5).map((x) => {
    const o = (x ?? {}) as Record<string, unknown>
    return { name: str(o.name, 80), upside: str(o.upside, 400), downside: str(o.downside, 400) }
  }) : []
  return {
    decision: str(r.decision, 200), decider: str(r.decider, 80), deadline: str(r.deadline, 10),
    stakes: pick(r.stakes, ['low', 'medium', 'high'] as const, 'medium'),
    reversibility: pick(r.reversibility, ['easy', 'hard', 'none'] as const, 'hard'),
    options: opts.length ? opts : emptyBrief().options,
    evidence: Array.isArray(r.evidence) ? r.evidence.filter((k): k is string => typeof k === 'string').slice(0, 8) : [],
    unknowns: str(r.unknowns, 1200),
  }
}
