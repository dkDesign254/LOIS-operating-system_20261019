import { headers } from 'next/headers'
import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { neonConfigured, neonSummary } from '@/lib/neon'
import { createApiKey, createWebhook, deleteWebhook, revokeApiKey } from '../actions'
import { SubmitButton } from '@/components/submit-button'

export const metadata = { title: 'Integrations' }

export default async function Integrations() {
  const ctx = await requireWorkspace()
  const host = (await headers()).get('host') ?? 'your-app.vercel.app'
  const base = `https://${host}/api/v1`

  const [{ data: keys }, { data: hooks }, { data: deliveries }, usage] = await Promise.all([
    ctx.sb.from('lois_api_keys').select('key_id, name, key_prefix, scopes, created_at, last_used_at, revoked_at').eq('tenant_id', ctx.ws.tenant_id).order('created_at', { ascending: false }),
    ctx.isAdmin ? ctx.sb.from('lois_webhooks').select('webhook_id, name, url, enabled, created_at').eq('tenant_id', ctx.ws.tenant_id) : Promise.resolve({ data: [] as { webhook_id: string; name: string; url: string; enabled: boolean; created_at: string }[] }),
    ctx.isAdmin ? ctx.sb.from('lois_webhook_deliveries').select('delivery_id, event_type, status_code, ok, error, created_at').eq('tenant_id', ctx.ws.tenant_id).order('created_at', { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
    neonSummary(ctx.ws.tenant_id),
  ])

  if (!ctx.isAdmin) {
    return (
      <div className="stack">
        <h1>Integrations</h1>
        <div className="banner">Only workspace owners and admins can manage API keys and webhooks.</div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div>
        <h1>Integrations</h1>
        <p className="muted">
          Connect LOIS to n8n, Make, Zapier or your own code. The API is versioned: <code>/api/v1</code> only ever gains new optional fields, so what you build today keeps working.
        </p>
      </div>

      <div className="card">
        <h2>API keys</h2>
        <ActionForm action={createApiKey} submit="Create key">
          <div className="grid two">
            <div>
              <label htmlFor="kn">Name</label>
              <input id="kn" name="name" type="text" required maxLength={80} placeholder="n8n production" />
            </div>
            <div style={{ alignSelf: 'end' }}>
              <label className="row" style={{ fontWeight: 400 }}>
                <input type="checkbox" name="write" /> Allow writes (submit entries for review)
              </label>
            </div>
          </div>
        </ActionForm>
        {keys?.length ? (
          <table style={{ marginTop: '1rem' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Scopes</th>
                <th>Last used</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.key_id}>
                  <td>{k.name}</td>
                  <td>
                    <code>{k.key_prefix}…</code>
                  </td>
                  <td>{k.scopes.join(', ')}</td>
                  <td className="muted">{k.last_used_at ? new Date(k.last_used_at).toLocaleString('en-GB') : 'never'}</td>
                  <td>
                    {k.revoked_at ? (
                      <span className="chip rejected">revoked</span>
                    ) : (
                      <form action={revokeApiKey}>
                        <input type="hidden" name="id" value={k.key_id} />
                        <SubmitButton className="btn ghost small">Revoke</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </div>

      <div className="card">
        <h2>Webhooks</h2>
        <p className="muted small">
          Sent as signed POSTs when knowledge is accepted or rejected, a help request is resolved, or a document is added. Verify the <code>LOIS-Signature</code> header (<code>t=timestamp,v1=HMAC-SHA256(timestamp + &quot;.&quot; + body)</code>) with the signing secret.
        </p>
        <ActionForm action={createWebhook} submit="Add webhook">
          <div className="grid two">
            <div>
              <label htmlFor="wn">Name</label>
              <input id="wn" name="name" type="text" required maxLength={80} placeholder="Make scenario" />
            </div>
            <div>
              <label htmlFor="wu">HTTPS URL</label>
              <input id="wu" name="url" type="url" required maxLength={500} placeholder="https://hook.eu1.make.com/…" />
            </div>
          </div>
        </ActionForm>
        {hooks?.length ? (
          <table style={{ marginTop: '1rem' }}>
            <tbody>
              {hooks.map((h) => (
                <tr key={h.webhook_id}>
                  <td>{h.name}</td>
                  <td className="muted" style={{ wordBreak: 'break-all' }}>
                    {h.url}
                  </td>
                  <td>
                    <form action={deleteWebhook}>
                      <input type="hidden" name="id" value={h.webhook_id} />
                      <SubmitButton className="btn ghost small">Remove</SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {deliveries?.length ? (
          <>
            <h3 style={{ marginTop: '1rem' }}>Recent deliveries</h3>
            <table>
              <tbody>
                {deliveries.map((d) => (
                  <tr key={d.delivery_id}>
                    <td>{d.event_type}</td>
                    <td>
                      <span className={`chip ${d.ok ? 'approved' : 'rejected'}`}>{d.ok ? 'delivered' : 'failed'}</span> {d.status_code ?? ''}
                    </td>
                    <td className="muted">{new Date(d.created_at).toLocaleString('en-GB')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </div>

      <div className="card soft">
        <h2>Use it from n8n or Make</h2>
        <p>
          Add an <b>HTTP Request</b> module. Base URL <code>{base}</code>, header <code>Authorization: Bearer &lt;your key&gt;</code>.
        </p>
        <ul className="muted">
          <li>
            <code>POST /search</code> with <code>{`{"query":"..."}`}</code> returns ranked, cited passages.
          </li>
          <li>
            <code>POST /knowledge</code> (write scope) with <code>{`{"title":"...","content":"..."}`}</code> lands in the review queue, never straight into trusted knowledge.
          </li>
          <li>
            <code>GET /health</code> needs no key. Full spec at <a href="/api/v1/openapi.json">/api/v1/openapi.json</a>.
          </li>
        </ul>
      </div>

      <div className="card soft">
        <h2>Analytics mirror (Neon)</h2>
        {neonConfigured() ? (
          usage?.length ? (
            <table>
              <thead>
                <tr>
                  <th>Answer type (30 days)</th>
                  <th>Count</th>
                  <th>Avg ms</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => (
                  <tr key={u.answer_mode}>
                    <td>{u.answer_mode}</td>
                    <td>{u.n}</td>
                    <td>{u.avg_ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="muted">Connected. No activity logged yet, or the analytics tables have not been created (see docs/NEON.md).</p>
          )
        ) : (
          <p className="muted">Not connected. Add NEON_DATABASE_URL in Vercel to mirror anonymised activity for analytics. Optional: LOIS works without it.</p>
        )}
      </div>
    </div>
  )
}
