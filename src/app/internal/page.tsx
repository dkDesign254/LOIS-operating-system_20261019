import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCtx } from '@/lib/session'
import { MfaGate } from './mfa'
import { setRequestStatus, extendTrial, setRunLimits, decideAccess, postUpdate, removeUpdate } from './actions'
import { ActionForm } from '@/components/forms'
import { SubmitButton } from '@/components/submit-button'

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
  const [{ data: ov }, { data: summary }, { data: reqs }, { data: access }, { data: internalTenants }, { data: updates }, { data: clientTenants }] = await Promise.all([
    ctx.sb.rpc('lois_staff_overview'),
    ctx.sb.rpc('lois_onboarding_summary'),
    ctx.sb.from('lois_data_requests').select('request_id, kind, status, user_email, note, created_at').order('created_at', { ascending: false }).limit(50),
    ctx.sb.from('lois_access_requests').select('request_id, email, requested_role, reason, status, decision_note, granted_role, created_at').order('created_at', { ascending: false }).limit(30),
    ctx.sb.from('lois_tenants').select('tenant_id, name').in('tenant_type', ['holding_company', 'business_arm']).order('name'),
    ctx.sb.from('lois_updates').select('update_id, kind, title, created_at').order('created_at', { ascending: false }).limit(8),
    ctx.sb.from('lois_tenants').select('tenant_id, name, tenant_type, plan').eq('tenant_type', 'client').order('name').limit(200),
  ])
  const o = (ov ?? {}) as { accounts?: number; workspaces?: number; internal_workspaces?: number; open_data_requests?: number; staff?: string[] }
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }} className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0 }}>Staff console</h1>
        <span className="row"><Link className="btn ghost" href="/internal/vault">Vault</Link><Link className="btn ghost" href="/app">Back to LOIS</Link></span>
      </div>
      <p className="muted">Only allow-listed staff with a second factor can see this. Everything here is read from the database under its own rules, not from the app.</p>
      <div className="grid two">
        <div className="card"><p className="muted small">Accounts</p><h2>{o.accounts ?? 0}</h2></div>
        <div className="card"><p className="muted small">Workspaces ({o.internal_workspaces ?? 0} internal)</p><h2>{o.workspaces ?? 0}</h2></div>
        <div className="card"><p className="muted small">Open privacy requests</p><h2>{o.open_data_requests ?? 0}</h2></div>
        <div className="card"><p className="muted small">Staff (allow-list)</p><p className="small">{(o.staff ?? []).join(', ') || 'none'}</p></div>
      </div>
      <div className="card">
        <h2>Internal access requests</h2>
        <p className="muted small">New accounts only ever get their own customer workspace. People who need more ask here. Approve gives the chosen role in the chosen internal workspace; deny sends your note back.</p>
        {access?.length ? (
          <ul className="plainlist">
            {access.map((a) => (
              <li key={a.request_id} style={{ padding: '0.6rem 0', borderTop: '1px solid var(--line)' }}>
                <b>{a.email}</b> <span className="muted small">· wants {a.requested_role} · {new Date(a.created_at).toLocaleDateString('en-GB')} · {a.status}</span>
                <br /><span className="small">{a.reason}</span>
                {a.status === 'pending' ? (
                  <form action={decideAccess} className="row" style={{ marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    <input type="hidden" name="id" value={a.request_id} />
                    <select name="tenant" aria-label="Workspace" defaultValue={internalTenants?.[0]?.tenant_id}>
                      {(internalTenants ?? []).map((t) => <option key={t.tenant_id} value={t.tenant_id}>{t.name}</option>)}
                    </select>
                    <select name="role" aria-label="Role" defaultValue={a.requested_role}>
                      <option value="viewer">viewer</option><option value="member">member</option><option value="reviewer">reviewer</option>
                    </select>
                    <input name="note" aria-label="Note" placeholder="Note (optional)" maxLength={500} />
                    <SubmitButton className="btn small" name="decision" value="approved">Approve</SubmitButton>
                    <SubmitButton className="btn ghost small" name="decision" value="denied">Deny</SubmitButton>
                  </form>
                ) : a.decision_note ? <><br /><span className="muted small">Note: {a.decision_note}</span></> : null}
              </li>
            ))}
          </ul>
        ) : <p className="muted">No requests.</p>}
      </div>
      <div className="card">
        <h2>Post an update to the side panel</h2>
        <p className="muted small">Shown to everyone in their right-hand panel: a LinkedIn post, a new framework, a system that works, or what people are doing with AI. Facts only, with a link to the source.</p>
        <ActionForm action={postUpdate as never} submit="Post">
          <div className="grid two">
            <div><label htmlFor="uk">Kind</label><select id="uk" name="kind"><option value="linkedin">LinkedIn</option><option value="framework">Framework</option><option value="system">System</option><option value="ai">AI in practice</option></select></div>
            <div><label htmlFor="ut">Title</label><input id="ut" name="title" required minLength={3} maxLength={140} /></div>
          </div>
          <label htmlFor="ub">Text</label><textarea id="ub" name="body" rows={3} required maxLength={600} />
          <label htmlFor="ul">Link (https, optional)</label><input id="ul" name="link" type="url" />
        </ActionForm>
        {updates?.length ? <ul className="plainlist">{updates.map((u) => (
          <li key={u.update_id} className="row" style={{ justifyContent: 'space-between', padding: '0.4rem 0' }}>
            <span><b>{u.title}</b> <span className="muted small">· {u.kind} · {new Date(u.created_at).toLocaleDateString('en-GB')}</span></span>
            <form action={removeUpdate}><input type="hidden" name="id" value={u.update_id} /><SubmitButton className="btn ghost small">Remove</SubmitButton></form>
          </li>))}</ul> : null}
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
                      <SubmitButton className="btn ghost small">Save</SubmitButton>
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
        <h2>Daily run allowance for a customer workspace</h2>
        <p className="muted small">What a subscription changes. Defaults: 10 test runs and 3 live runs a day. Every change is logged with your name.</p>
        <ActionForm action={setRunLimits as never} submit="Save allowance">
          <label htmlFor="rt">Workspace</label>
          <select id="rt" name="tenant">{(clientTenants ?? []).map((t) => <option key={t.tenant_id} value={t.tenant_id}>{t.name} ({t.plan})</option>)}</select>
          <div className="grid two">
            <div><label htmlFor="rtest">Test runs per day</label><input id="rtest" name="test" type="number" min={0} max={100000} defaultValue={10} required /></div>
            <div><label htmlFor="rlive">Live runs per day</label><input id="rlive" name="live" type="number" min={0} max={100000} defaultValue={3} required /></div>
          </div>
          <label htmlFor="rn">Reason (for example: Starter plan paid, invoice 123)</label><input id="rn" name="note" maxLength={200} />
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
