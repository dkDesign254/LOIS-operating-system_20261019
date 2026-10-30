import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireWorkspace } from '@/lib/session'
import { SubmitButton } from '@/components/submit-button'
import { SITE_URL } from '@/lib/site'
import { addConnector, switchConnector } from './actions'

export const metadata = { title: 'Connectors' }
const DONE: Record<string, string> = { added: 'Connector saved. It is OFF until you switch it on.', on: 'Switched on and logged.', off: 'Switched off and logged.' }

export default async function Connectors({ searchParams }: { searchParams: Promise<{ error?: string; done?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  if (!ctx.isAdmin) notFound()
  const [{ data: cons }, { data: log }, { data: lim }] = await Promise.all([
    ctx.sb.from('lois_connectors').select('connector_id,provider,method,label,enabled,activated_at,activation_reason,deactivated_at,created_at').eq('tenant_id', ctx.ws.tenant_id).order('created_at', { ascending: false }),
    ctx.sb.from('lois_admin_log').select('log_id,actor_email,action,detail,at').eq('tenant_id', ctx.ws.tenant_id).order('at', { ascending: false }).limit(25),
    ctx.sb.rpc('lois_runs_today', { p_tenant: ctx.ws.tenant_id }),
  ])
  const when = (s: string) => new Date(s).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })
  const u = lim as { test_used: number; test_cap: number; live_used: number; live_cap: number } | null
  return (
    <div className="stack">
      <div><h1>Connectors</h1><p className="muted">A connector lets LOIS hand an approved run to your automation (Make, n8n, Zapier and others). Nothing is sent until an owner or admin switches a connector on, with a reason that is logged. Live runs also need a second person's approval each time.</p>
        {u && <p className="small">Today's allowance: {u.test_used}/{u.test_cap} test runs, {u.live_used}/{u.live_cap} live runs. Your plan sets these; staff can raise them.</p>}</div>
      {sp.error && <p className="err" role="alert">{sp.error}</p>}
      {sp.done && <p className="ok" role="status">{DONE[sp.done]}</p>}

      <section className="card"><h2 className="mono">Your connectors</h2>
        {cons?.length ? <ul className="plainlist">{cons.map((c) => (
          <li key={c.connector_id} style={{ padding: '0.7rem 0' }}>
            <b>{c.label}</b> <span className="chip">{c.provider}</span> <span className="chip">{c.method}</span> <span className={`chip ${c.enabled ? 'approved' : ''}`}>{c.enabled ? 'ON' : 'off'}</span>
            {c.enabled && c.activated_at && <p className="muted small">Switched on {when(c.activated_at)}. Reason: {c.activation_reason}</p>}
            {!c.enabled && c.deactivated_at && <p className="muted small">Switched off {when(c.deactivated_at)}.</p>}
            <form className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <input type="hidden" name="id" value={c.connector_id} />
              {c.enabled ? <SubmitButton className="btn ghost small" formAction={switchConnector} pendingText="Saving…">Switch off</SubmitButton> : (<>
                <label className="sr-only" htmlFor={'r' + c.connector_id}>Reason</label><input id={'r' + c.connector_id} name="reason" placeholder="Why switch it on? (logged)" maxLength={300} style={{ flex: '1 1 240px' }} />
                <input type="hidden" name="on" value="1" /><SubmitButton className="btn small" formAction={switchConnector} pendingText="Saving…">Switch on</SubmitButton></>)}
            </form>
          </li>))}</ul> : <p className="muted">None yet.</p>}
      </section>

      <form className="card" aria-labelledby="add-h"><h2 id="add-h" className="mono">Add a connector</h2>
        <div className="grid two">
          <div><label htmlFor="provider">Provider</label><select id="provider" name="provider">{['make', 'n8n', 'zapier', 'langchain', 'odoo', 'zoho', 'custom'].map((p) => <option key={p}>{p}</option>)}</select></div>
          <div><label htmlFor="method">How</label><select id="method" name="method"><option value="webhook">Webhook (works on free plans)</option><option value="api">API (needs a paid plan; for Make this is blocked on the free plan)</option></select></div>
        </div>
        <label htmlFor="label">Name</label><input id="label" name="label" maxLength={80} required placeholder="Social posts in Make" />
        <label htmlFor="endpoint">Webhook address (https)</label><input id="endpoint" name="endpoint" maxLength={500} placeholder="https://hook.eu1.make.com/..." />
        <p className="muted small">The address is stored privately and is never shown again. Saving does not switch it on.</p>
        <SubmitButton className="btn" formAction={addConnector} pendingText="Saving…">Save connector</SubmitButton>
      </form>

      <section className="card"><h2 className="mono">How to connect Make (free plan)</h2>
        <ol><li>In Make, create a scenario that starts with a <b>Custom webhook</b> and copy its address.</li>
          <li>Build the steps you want after it (for example post to LinkedIn). Put a human-visible test mode first.</li>
          <li>At the end, add an HTTP module that POSTs <code>{'{"run_id": ..., "token": ..., "result": {...}}'}</code> to <code>{SITE_URL}/api/v1/run-callback</code>, using the <code>run_id</code> and <code>callback_token</code> LOIS sent you. This lets LOIS log what happened.</li>
          <li>Paste the address above, then switch it on with a reason. n8n and Zapier work the same way.</li></ol>
        <p className="muted small">LOIS sends: run_id, use_case, input, config, approval_note, callback_url, callback_token. It does not send your Knowledge bank.</p></section>

      <section className="card"><h2 className="mono">Admin log</h2>
        {log?.length ? <table className="small"><thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead><tbody>{log.map((l) => <tr key={l.log_id}><td>{when(l.at)}</td><td>{l.actor_email ?? 'staff'}</td><td>{l.action}{(l.detail as { reason?: string; note?: string })?.reason ? `: ${(l.detail as { reason: string }).reason}` : ''}</td></tr>)}</tbody></table> : <p className="muted">Nothing logged yet.</p>}
      </section>
      <p className="small"><Link href="/app/sandbox/hub">Back to the Use case hub</Link></p>
    </div>
  )
}
