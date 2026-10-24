import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCtx } from '@/lib/session'
import { MfaGate } from './mfa'
import { setRequestStatus, extendTrial } from './actions'
import { ActionForm } from '@/components/forms'

export const metadata = { title: 'Staff console' }
export const dynamic = 'force-dynamic'

export default async function Internal() {
  const ctx = await getCtx()
  if (!ctx.isStaff) notFound() // customers see a 404: the surface is not advertised
  const { data: aal } = await ctx.sb.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel !== 'aal2') {
    return (
      <div className="authwrap"><MfaGate hasFactor={aal?.nextLevel === 'aal2'} /></div>
    )
  }
  const [{ data: ov }, { data: summary }, { data: reqs }] = await Promise.all([
    ctx.sb.rpc('lois_staff_overview'),
    ctx.sb.rpc('lois_onboarding_summary'),
    ctx.sb.from('lois_data_requests').select('request_id, kind, status, user_email, note, created_at').order('created_at', { ascending: false }).limit(50),
  ])
  const o = (ov ?? {}) as { accounts?: number; workspaces?: number; internal_workspaces?: number; open_data_requests?: number; staff?: string[] }
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }} className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Staff console</h1>
        <Link className="btn ghost" href="/app">Back to LOIS</Link>
      </div>
      <p className="muted">Only allow-listed staff with a second factor can see this. Everything here is read from the database under its own rules, not from the app.</p>
      <div className="grid two">
        <div className="card"><p className="muted small">Accounts</p><h2>{o.accounts ?? 0}</h2></div>
        <div className="card"><p className="muted small">Workspaces ({o.internal_workspaces ?? 0} internal)</p><h2>{o.workspaces ?? 0}</h2></div>
        <div className="card"><p className="muted small">Open privacy requests</p><h2>{o.open_data_requests ?? 0}</h2></div>
        <div className="card"><p className="muted small">Staff (allow-list)</p><p className="small">{(o.staff ?? []).join(', ') || 'none'}</p></div>
      </div>
      <div className="card">
        <h2>Privacy requests</h2>
        {reqs?.length ? (
          <table>
            <tbody>
              {reqs.map((r) => (
                <tr key={r.request_id}>
                  <td><b>{r.kind}</b><br /><span className="muted small">{r.user_email ?? 'deleted user'} · {new Date(r.created_at).toLocaleDateString('en-GB')}</span>{r.note && <><br /><span className="small">{r.note}</span></>}</td>
                  <td>
                    <form action={setRequestStatus} className="row">
                      <input type="hidden" name="id" value={r.request_id} />
                      <select name="status" defaultValue={r.status} aria-label="Status">
                        <option value="open">open</option><option value="in_progress">in progress</option><option value="done">done</option><option value="declined">declined</option>
                      </select>
                      <button className="btn ghost small">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="muted">No requests. Respond to each within 30 days.</p>}
      </div>
      <div className="card">
        <h2>Extend someone&apos;s sandbox trial</h2>
        <ActionForm action={extendTrial as never} submit="Extend">
          <div className="grid two">
            <div><label htmlFor="te">Their email</label><input id="te" name="email" type="email" required /></div>
            <div><label htmlFor="td">Days (1 to 90)</label><input id="td" name="days" type="number" min={1} max={90} defaultValue={14} required /></div>
          </div>
          <label htmlFor="tn">Note (optional)</label><input id="tn" name="note" maxLength={200} />
        </ActionForm>
      </div>
      <div className="card">
        <h2>What new people say they want (aggregate)</h2>
        {summary?.length ? (
          <table>
            <thead><tr><th>Wants</th><th>For</th><th>Type</th><th>From</th><th>People</th></tr></thead>
            <tbody>{(summary as { intent: string; audience: string; org_type: string; source: string; n: number }[]).map((s, i) => <tr key={i}><td>{s.intent}</td><td>{s.audience}</td><td>{s.org_type}</td><td>{s.source}</td><td>{s.n}</td></tr>)}</tbody>
          </table>
        ) : <p className="muted">No answers yet.</p>}
      </div>
    </div>
  )
}
