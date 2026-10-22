import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { Guide, Pill, fmt } from '@/components/ui'
import { createBrief } from '../control-actions'

export const metadata = { title: 'Decisions' }
const TONE = { draft: 'info', pending: 'info', needs_info: 'warn', approved: 'ok', rejected: 'none' } as const

export default async function Decisions() {
  const ctx = await requireWorkspace()
  const t = ctx.ws.tenant_id
  const canWrite = ['owner', 'admin', 'reviewer', 'member'].includes(ctx.ws.role)
  const [briefs, audit] = await Promise.all([
    ctx.sb.from('lois_decision_briefs').select('brief_id, title, arm, risk, status, amount_kes, evidence_present, created_at').eq('tenant_id', t).order('created_at', { ascending: false }).limit(60),
    ctx.sb.from('lois_audit').select('audit_id, action, target, note, created_at').eq('tenant_id', t).order('created_at', { ascending: false }).limit(12),
  ])
  return (
    <div className="stack">
      <div>
        <h1>Decisions</h1>
        <p className="muted">LOIS prepares requests. People decide. Every decision is logged, and recording one never sends, pays or publishes anything.</p>
      </div>
      <Guide
        what="The control point. Each request becomes a Decision Brief with five separate readiness measures. Review and approval are separate."
        doit="Start a draft, open it, draft the brief, write your reason, then approve, reject or ask for more. High-risk requests cannot be approved without evidence."
        dont="Do not paste sensitive evidence here: refer to it by name. Approving records your decision only; a person still does the action."
      />
      {canWrite && (
        <details className="card">
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>New decision (saved as a draft)</summary>
          <ActionForm action={createBrief} submit="Save draft">
            <div className="grid two">
              <div className="field"><label htmlFor="ti">The decision</label><input id="ti" type="text" name="title" required minLength={6} maxLength={200} placeholder="One line, e.g. Hire a freelance designer for Q1" /></div>
              <div className="field"><label htmlFor="dm">Decision-maker</label><input id="dm" type="text" name="decision_maker" required maxLength={80} placeholder="Who decides" /></div>
              <div className="field"><label htmlFor="ar">Business arm</label><input id="ar" type="text" name="arm" maxLength={80} placeholder="e.g. Branding" /></div>
              <div className="field"><label htmlFor="dl">Deadline</label><input id="dl" type="date" name="deadline" /></div>
              <div className="field"><label htmlFor="rv">Reversibility</label><select id="rv" name="reversibility"><option>Easy to reverse</option><option>Hard to reverse</option><option>Cannot be reversed</option></select></div>
              <div className="field"><label htmlFor="af">Affected people</label><input id="af" type="text" name="affected" maxLength={160} /></div>
              <div className="field"><label htmlFor="se">Sensitivity</label><select id="se" name="sensitivity"><option>Normal</option><option>Sensitive</option></select></div>
              <div className="field"><label htmlFor="ri">Risk</label><select id="ri" name="risk"><option>low</option><option>medium</option><option>high</option></select></div>
              <div className="field"><label htmlFor="am">Amount in KES (optional)</label><input id="am" type="number" name="amount" min="0" /></div>
              <div className="field"><label htmlFor="ev">Evidence you already have (optional)</label><input id="ev" type="text" name="evidence" maxLength={300} placeholder="Name the documents. Do not paste sensitive content." /></div>
            </div>
            <p className="muted small">A draft does not request or imply approval.</p>
          </ActionForm>
        </details>
      )}
      <section className="card">
        <h2>Requests</h2>
        {briefs.data?.length ? (
          <ul className="list">
            {briefs.data.map((b) => (
              <li key={b.brief_id}>
                <div className="l">
                  <b>{b.title}</b>
                  <div className="muted small">{b.arm ?? 'No arm'} · {fmt(b.created_at)}{b.amount_kes ? ` · KES ${Number(b.amount_kes).toLocaleString('en-GB')}` : ''} · evidence {b.evidence_present ? 'attached' : 'none'}</div>
                </div>
                <div className="row">
                  <Pill tone={b.risk === 'high' ? 'crit' : b.risk === 'medium' ? 'warn' : 'ok'}>{b.risk} risk</Pill>
                  <Pill tone={TONE[b.status as keyof typeof TONE] ?? 'none'}>{b.status.replace('_', ' ')}</Pill>
                  <Link className="btn small" href={`/app/decisions/${b.brief_id}`}>{b.status === 'approved' || b.status === 'rejected' ? 'View' : 'Open brief'}</Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No requests yet.</p>
        )}
      </section>
      <section className="card">
        <h2>Audit log</h2>
        <p className="muted small">Latest 12 entries. Entries cannot be edited or deleted.</p>
        {audit.data?.length ? (
          <ul className="list">
            {audit.data.map((a) => (
              <li key={a.audit_id}><div className="l"><b>{a.action}</b><div className="muted small">{a.target}{a.note ? ` · ${a.note}` : ''}</div></div><span className="muted small">{fmt(a.created_at)}</span></li>
            ))}
          </ul>
        ) : (
          <p className="muted">No entries yet. Decisions you make appear here.</p>
        )}
      </section>
    </div>
  )
}
