import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireInternal } from '@/lib/session'
import { llmEnabled } from '@/lib/llm'
import { readiness, type Challenge } from '@/lib/readiness'
import { Pill, fmt } from '@/components/ui'
import { challengeBrief, generateBrief, generateHandoff, markChallenge, recordDecision, requestEvidence, saveEvidence, saveLearning, submitBrief } from '../../control-actions'

export const metadata = { title: 'Decision brief' }

export default async function BriefPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; recorded?: string }> }) {
  const { id } = await params
  const sp = await searchParams
  const ctx = await requireInternal()
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound()
  const { data: b } = await ctx.sb.from('lois_decision_briefs').select('*').eq('brief_id', id).eq('tenant_id', ctx.ws.tenant_id).maybeSingle()
  if (!b) notFound()
  const [recs, evs] = await Promise.all([
    ctx.sb.from('lois_decision_records').select('version, decision, reason, conditions, review_date, expected, correlation, executed, created_at').eq('brief_id', id).order('version', { ascending: false }),
    ctx.sb.from('lois_evidence_requests').select('request_id, owner, due, text, status').eq('brief_id', id).order('created_at', { ascending: false }),
  ])
  const canDecide = ['owner', 'admin', 'reviewer'].includes(ctx.ws.role)
  const canDraft = canDecide || ctx.ws.role === 'member'
  const challenge = (Array.isArray(b.challenge) ? b.challenge : []) as Challenge[]
  const ms = readiness(b, challenge, canDecide)
  const done = b.status === 'approved' || b.status === 'rejected'
  const blocked = b.risk === 'high' && !b.evidence_present
  const llm = llmEnabled()

  const known = [`Request: ${b.title}`, `Arm: ${b.arm ?? 'not stated'}`, `Requested by: ${b.requester ?? 'not stated'}`, `Risk rating: ${b.risk}`]
  if (b.deadline) known.push(`Deadline: ${b.deadline}`)
  known.push(`Reversibility: ${b.reversibility}`)
  if (b.affected) known.push(`Affected: ${b.affected}`)
  if (b.amount_kes) known.push(`Amount: KES ${Number(b.amount_kes).toLocaleString('en-GB')}`)
  if (b.evidence_present) known.push(`Evidence attached: ${b.evidence_note ?? 'yes'}`)
  const unknown = [...(b.evidence_present ? [] : ['No evidence is attached']), 'What happens after approval is not tracked yet (no outcome ledger)']

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <Link href="/app/decisions" className="muted small">← Decisions</Link>
          <h1 style={{ marginTop: 4 }}>{b.title}</h1>
        </div>
        <div className="row"><Pill tone={b.risk === 'high' ? 'crit' : b.risk === 'medium' ? 'warn' : 'ok'}>{b.risk} risk</Pill><Pill tone={b.status === 'approved' ? 'ok' : b.status === 'needs_info' ? 'warn' : 'info'}>{b.status.replace('_', ' ')}</Pill></div>
      </div>
      {sp.error && <p className="err" role="alert">{sp.error}</p>}
      {sp.recorded && <p className="ok" role="status">Decision and reason recorded. Nothing was executed.</p>}
      {b.sensitivity === 'Sensitive' && <div className="banner">Marked sensitive. Refer to evidence by name only; do not paste it here.</div>}

      <section className="card">
        <div className="grid two">
          <div><b>On record</b><ul className="tight do">{known.map((k) => <li key={k}>{k}</li>)}</ul></div>
          <div><b>Not on record</b><ul className="tight dont">{unknown.map((k) => <li key={k}>{k}</li>)}</ul></div>
        </div>
        <b style={{ display: 'block', marginTop: 12 }}>Readiness (open each measure for its definition and records)</b>
        {ms.map((m) => (
          <details className="measure" key={m.key}>
            <summary><Pill tone={m.status}>{m.label}</Pill> {m.text}</summary>
            <p className="muted" style={{ marginTop: 6 }}>{m.definition}</p>
            <ul className="tight">{m.records.map((r) => <li key={r}>{r}</li>)}</ul>
          </details>
        ))}
        {!done && canDraft && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Update the evidence on record</summary>
            <form action={saveEvidence} className="stack">
              <input type="hidden" name="id" value={id} />
              <div className="field"><label htmlFor="e1">Evidence (name the documents; leave empty if none)</label><input id="e1" type="text" name="evidence" defaultValue={b.evidence_note ?? ''} maxLength={300} /></div>
              <div className="grid two">
                <div className="field"><label htmlFor="e2">Evidence date</label><input id="e2" type="date" name="evidence_date" defaultValue={b.evidence_date ?? ''} /></div>
                <div className="field"><label htmlFor="e3">Source state</label><select id="e3" name="source_state" defaultValue={b.source_state ?? ''}><option value="">Not assessed</option><option value="validated">Validated</option><option value="unvalidated">Not validated</option></select></div>
              </div>
              <div><button className="btn ghost small">Save evidence</button></div>
            </form>
          </details>
        )}
      </section>

      {b.status === 'draft' && canDraft && (
        <section className="card row">
          <form action={submitBrief}><input type="hidden" name="id" value={id} /><button className="btn">Submit for decision</button></form>
          <span className="muted small">This is a draft. Saving it did not request or imply approval.</span>
        </section>
      )}

      <section className="card">
        <h2>Brief</h2>
        <div className="row" style={{ marginBottom: 8 }}>
          {canDraft && <form action={generateBrief}><input type="hidden" name="id" value={id} /><button className="btn" disabled={!llm}>{b.brief_text ? 'Regenerate brief' : 'Draft the brief'}</button></form>}
          {canDraft && <form action={challengeBrief}><input type="hidden" name="id" value={id} /><button className="btn ghost" disabled={!llm || !b.brief_text}>Challenge this brief</button></form>}
          <span className="muted small">{llm ? 'Generated drafts. LOIS advises. You decide.' : 'Generated drafts are off (no AI key set). You can still record a decision with your own reasoning.'}</span>
        </div>
        {b.brief_text && <div className="out">{b.brief_text}</div>}
        {challenge.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <b>Challenge points (generated, unverified)</b>
            <ul className="list">
              {challenge.map((c, i) => (
                <li key={i}>
                  <div className="l"><b>{c.point}</b><div className="muted small">Consequence: {c.consequence} · Reversibility: {c.reversibility} · To resolve: {c.resolve}</div></div>
                  <div className="seg">
                    {(['accepted', 'rejected', 'unresolved'] as const).map((m) => (
                      <form action={markChallenge} key={m}><input type="hidden" name="id" value={id} /><input type="hidden" name="i" value={i} /><input type="hidden" name="mark" value={m} /><button aria-pressed={c.mark === m}>{m}</button></form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {!done && b.status !== 'draft' && canDraft && (
        <section className="card">
          <h2>Request more evidence</h2>
          <form action={requestEvidence} className="stack">
            <input type="hidden" name="id" value={id} />
            <div className="grid two">
              <div className="field"><label htmlFor="o">Owner</label><input id="o" type="text" name="owner" required maxLength={80} placeholder="Who must provide it" /></div>
              <div className="field"><label htmlFor="d">Due date</label><input id="d" type="date" name="due" /></div>
            </div>
            <div className="field"><label htmlFor="x">What is needed</label><input id="x" type="text" name="text" required minLength={4} maxLength={300} /></div>
            <div className="row"><button className="btn ghost">Request evidence</button><span className="muted small">The decision stays visibly pending. A request is not a rejection.</span></div>
          </form>
          {evs.data?.length ? <ul className="tight">{evs.data.map((r) => <li key={r.request_id}>{r.text} · owner {r.owner}{r.due ? ` · due ${r.due}` : ''} · {r.status}</li>)}</ul> : null}
        </section>
      )}

      {!done && b.status !== 'draft' && (
        <section className="card">
          <h2>Record your decision</h2>
          {canDecide ? (
            <form action={recordDecision} className="stack">
              <input type="hidden" name="id" value={id} />
              <div className="field"><label htmlFor="r">Your reason (required)</label><textarea id="r" name="reason" required minLength={8} maxLength={600} placeholder="Why are you deciding this way? One or two sentences you could repeat to the team." /></div>
              <div className="grid two">
                <div className="field"><label htmlFor="c">Conditions (optional)</label><input id="c" type="text" name="conditions" maxLength={400} placeholder="e.g. only after the client signs" /></div>
                <div className="field"><label htmlFor="v">Review date (optional)</label><input id="v" type="date" name="review" /></div>
              </div>
              <div className="field"><label htmlFor="ex">Expected outcome (optional, for the learning review)</label><input id="ex" type="text" name="expected" maxLength={400} /></div>
              {blocked && <div className="banner">High-risk request with no evidence. It cannot be approved until evidence is attached. You can still request evidence or reject.</div>}
              <div className="row">
                <button className="btn" name="decision" value="approved" disabled={blocked}>Approve</button>
                <button className="btn ghost" name="decision" value="needs_info">Ask for more</button>
                <button className="btn ghost" name="decision" value="rejected">Reject</button>
              </div>
              <p className="muted small">Approving records your decision only. It cannot send, pay, publish or change anything.</p>
            </form>
          ) : (
            <p className="muted">Only an owner, admin or reviewer can record a decision. You can still add evidence and read the brief.</p>
          )}
        </section>
      )}

      {b.status === 'approved' && (
        <section className="card">
          <h2>Execution handoff (preview)</h2>
          <div className="row"><form action={generateHandoff}><input type="hidden" name="id" value={id} /><button className="btn ghost" disabled={!llm}>Preview the plan</button></form><Pill tone="warn">Awaiting explicit execution authorisation</Pill></div>
          {b.handoff_text && <><div className="out" style={{ marginTop: 8 }}>{b.handoff_text}</div><p className="muted small">Preview only. Each external action needs its own authorisation, an idempotency key and a recorded result.</p></>}
          {b.outcome ? (
            <p style={{ marginTop: 12 }}><b>Outcome recorded:</b> {b.outcome}</p>
          ) : (
            <form action={saveLearning} className="stack" style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={id} />
              <div className="field"><label htmlFor="out">Learning review: what actually happened?</label><input id="out" type="text" name="outcome" required minLength={8} maxLength={500} placeholder="Observed result, and what to keep, correct or expire" /></div>
              <div className="row"><button className="btn ghost small">Save learning</button><span className="muted small">Describe circumstances and reasoning. Do not judge individuals in hindsight.</span></div>
            </form>
          )}
        </section>
      )}

      <section className="card">
        <h2>Decision history</h2>
        <p className="muted small">Each record is versioned and cannot be edited. A correction is a new version.</p>
        {recs.data?.length ? (
          <ul className="list">
            {recs.data.map((r) => (
              <li key={r.correlation}>
                <div className="l">
                  <b>{r.decision.replace('_', ' ')} · v{r.version}</b> <span className="muted small">{fmt(r.created_at)}</span>
                  <div className="muted small">Reason: {r.reason}{r.conditions ? ` · Conditions: ${r.conditions}` : ''}{r.review_date ? ` · Review ${r.review_date}` : ''}{r.expected ? ` · Expected: ${r.expected}` : ''}</div>
                  <div className="muted small">Correlation {r.correlation} · executed: {r.executed ? 'yes' : 'no'}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No decision recorded yet.</p>
        )}
      </section>
    </div>
  )
}
