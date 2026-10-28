import { getCtx } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { requestData, withdrawUpdates } from '../actions'
import { POLICY_VERSION } from '@/lib/policy'
import { SubmitButton } from '@/components/submit-button'

export const metadata = { title: 'Privacy & my data' }

export default async function PrivacyPage() {
  const ctx = await getCtx()
  const [{ data: consents }, { data: reqs }, { data: onb }] = await Promise.all([
    ctx.sb.from('lois_consents').select('purpose, policy_version, granted, source, created_at').order('created_at', { ascending: false }).limit(20),
    ctx.sb.from('lois_data_requests').select('request_id, kind, status, created_at').order('created_at', { ascending: false }).limit(10),
    ctx.sb.from('lois_onboarding').select('intent, audience, org_type, completed_at').maybeSingle(),
  ])
  const updates = consents?.find((c) => c.purpose === 'product_updates')?.granted
  return (
    <div className="stack">
      <div>
        <h1>Privacy &amp; my data</h1>
        <p className="muted">What we hold about you, and what you can do about it. Notice version {POLICY_VERSION}. Read the <a href="/privacy">full notice</a>.</p>
      </div>
      <div className="card">
        <h2>Your answers</h2>
        <p className="muted">{onb ? `${onb.intent.replace('_', ' ')} · ${onb.audience.replace('_', ' ')} · ${onb.org_type.replace('_', ' ')} (saved ${new Date(onb.completed_at).toLocaleDateString('en-GB')})` : 'None saved.'}</p>
        <a className="btn" href="/app/privacy/export" download>Download all my data (JSON)</a>
      </div>
      <div className="card">
        <h2>Product updates</h2>
        <p className="muted">{updates ? 'You are opted in.' : 'You are opted out.'}</p>
        {updates && <form action={withdrawUpdates}><SubmitButton className="btn ghost">Withdraw consent</SubmitButton></form>}
      </div>
      <div className="card">
        <h2>Make a request</h2>
        <ActionForm action={requestData} submit="Send request">
          <label htmlFor="kind">I want to</label>
          <select id="kind" name="kind" defaultValue="export">
            <option value="export">Get a copy of my data</option>
            <option value="correct">Correct my data</option>
            <option value="restrict">Restrict how my data is used</option>
            <option value="delete">Delete my account and data</option>
          </select>
          <label htmlFor="note">Anything we should know (optional)</label>
          <textarea id="note" name="note" maxLength={1000} rows={3} />
        </ActionForm>
        {reqs?.length ? (
          <table style={{ marginTop: '1rem' }}>
            <tbody>{reqs.map((r) => <tr key={r.request_id}><td>{r.kind}</td><td><span className="chip">{r.status}</span></td><td className="muted">{new Date(r.created_at).toLocaleDateString('en-GB')}</td></tr>)}</tbody>
          </table>
        ) : null}
      </div>
      <div className="card soft">
        <h3>Consent history</h3>
        <table>
          <tbody>{(consents ?? []).map((c, i) => <tr key={i}><td>{c.purpose.replace('_', ' ')}</td><td>{c.granted ? 'agreed' : 'withdrawn'}</td><td className="muted">v{c.policy_version} · {c.source}</td><td className="muted">{new Date(c.created_at).toLocaleString('en-GB')}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
