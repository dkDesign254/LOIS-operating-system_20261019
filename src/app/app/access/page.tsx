import { getCtx } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { requestInternalAccess, withdrawAccessRequest } from './actions'
import { SubmitButton } from '@/components/submit-button'

export const metadata = { title: 'Access' }
export const dynamic = 'force-dynamic'

const label: Record<string, string> = { pending: 'Waiting for a staff member', approved: 'Approved', denied: 'Not approved', withdrawn: 'Withdrawn' }

export default async function Access() {
  const ctx = await getCtx()
  const { data: reqs } = await ctx.sb.from('lois_access_requests').select('request_id,requested_role,reason,status,decision_note,created_at,decided_at').eq('user_id', ctx.user.id).order('created_at', { ascending: false }).limit(10)
  const pending = (reqs ?? []).some((r) => r.status === 'pending')
  return (
    <div className="stack" style={{ maxWidth: 680 }}>
      
      <div>
        <h1>Access</h1>
        <p className="muted">
          You start with your own workspace and everything in it. Some areas belong to the company that runs LOIS. If you work with that team, you can ask for access here. A named staff member checks each request. Nothing opens until they approve it.
        </p>
      </div>
      {!pending && (
        <div className="card">
          <h2>Ask for team access</h2>
          <ActionForm action={requestInternalAccess} submit="Send request">
            <div className="field">
              <label htmlFor="role">What level do you need?</label>
              <select id="role" name="role" defaultValue="viewer">
                <option value="viewer">Read only</option>
                <option value="member">Contribute</option>
                <option value="reviewer">Review and approve knowledge</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="reason">Why do you need it?</label>
              <textarea id="reason" name="reason" rows={3} minLength={10} maxLength={1000} required placeholder="Who you work with and what you need to do" />
            </div>
          </ActionForm>
        </div>
      )}
      <div className="card">
        <h2>Your requests</h2>
        {reqs?.length ? (
          <ul className="plainlist">
            {reqs.map((r) => (
              <li key={r.request_id} style={{ padding: '0.5rem 0' }}>
                <b>{label[r.status] ?? r.status}</b> <span className="muted small">· {r.requested_role} · {new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                <br /><span className="small">{r.reason}</span>
                {r.decision_note && <><br /><span className="muted small">Reply: {r.decision_note}</span></>}
                {r.status === 'pending' && (
                  <form action={withdrawAccessRequest} style={{ marginTop: '0.4rem' }}>
                    <input type="hidden" name="id" value={r.request_id} />
                    <SubmitButton className="btn ghost small">Withdraw</SubmitButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="muted">No requests yet.</p>}
      </div>
    </div>
  )
}
