/** Five separate decision-readiness measures. There is deliberately no single score. */
export type Brief = {
  risk: string
  amount_kes: number | null
  evidence_present: boolean
  evidence_note: string | null
  evidence_date: string | null
  deadline: string | null
  source_state: string | null
  status: string
  requester: string | null
}
export type Challenge = { point: string; consequence?: string; reversibility?: string; resolve?: string; mark: 'accepted' | 'rejected' | 'unresolved' }
export type Status = 'ok' | 'warn' | 'crit' | 'none'
export type Measure = { key: string; label: string; status: Status; text: string; definition: string; records: string[] }

export function readiness(b: Brief, challenge: Challenge[], canWrite: boolean): Measure[] {
  const needAmount = b.risk === 'high' || b.amount_kes != null
  const required = ['requester', 'evidence', ...(needAmount ? ['amount'] : [])]
  const have = required.filter((k) => (k === 'evidence' ? b.evidence_present : k === 'requester' ? Boolean(b.requester) : b.amount_kes != null))

  const coverage: Measure = {
    key: 'coverage',
    label: 'Evidence coverage',
    status: have.length === required.length ? 'ok' : b.risk === 'high' && !b.evidence_present ? 'crit' : 'warn',
    text: `${have.length} of ${required.length} required`,
    definition: `Required fields present versus missing. Required for this request: ${required.join(', ')}.`,
    records: required.map((k) => `${k}: ${have.includes(k) ? 'present' : 'missing'}`),
  }

  let fresh: Measure
  if (b.evidence_date && b.deadline) {
    const age = Math.round((new Date(b.deadline).getTime() - new Date(b.evidence_date).getTime()) / 864e5)
    fresh = { key: 'freshness', label: 'Freshness', status: age <= 30 ? 'ok' : 'warn', text: `${age} days old at deadline`, definition: 'Age of the evidence relative to the decision deadline. Rule used here: 30 days or less is fresh.', records: [`Evidence date: ${b.evidence_date}`, `Deadline: ${b.deadline}`] }
  } else {
    fresh = { key: 'freshness', label: 'Freshness', status: 'none', text: 'Not assessed', definition: 'Age of the evidence relative to the decision deadline.', records: ['No evidence date or deadline is recorded.'] }
  }

  const rel: Measure = {
    key: 'reliability',
    label: 'Source reliability',
    status: b.source_state === 'validated' ? 'ok' : b.source_state === 'unvalidated' ? 'warn' : 'none',
    text: b.source_state === 'validated' ? 'Validated' : b.source_state === 'unvalidated' ? 'Not validated' : 'Not assessed',
    definition: 'Provenance and validation state of the evidence. It is not a generated confidence number.',
    records: [`Source state: ${b.source_state ?? 'not recorded'}`],
  }

  const open = challenge.filter((c) => c.mark === 'unresolved').length
  const missing = (b.evidence_present ? 0 : 1) + (b.risk === 'high' && b.amount_kes == null ? 1 : 0)
  const n = open + missing
  const unresolved: Measure = {
    key: 'unresolved',
    label: 'Unresolved issues',
    status: n > 0 ? 'warn' : challenge.length ? 'ok' : 'none',
    text: `${n} known${challenge.length ? '' : ', not challenged yet'}`,
    definition: 'Critical unknowns, conflicting evidence and assumptions that need an owner. Zero known is not the same as zero.',
    records: [`Missing required evidence or amount: ${missing}`, `Challenge points still unresolved: ${open}`, `Challenge run: ${challenge.length ? 'yes' : 'no'}`],
  }

  const authority: Measure = {
    key: 'authority',
    label: 'Authority and safeguards',
    status: canWrite ? 'ok' : 'warn',
    text: canWrite ? 'may record decisions' : 'cannot record decisions',
    definition: 'Identity, role, scope, approval and execution permission are separate states.',
    records: [`Role: ${canWrite ? 'may record decisions' : 'read or draft only'}`, 'Scope: not defined yet', `Approval: ${b.status.replace('_', ' ')}`, 'Execution permission: not granted. This tool never executes.'],
  }
  return [coverage, fresh, rel, unresolved, authority]
}
