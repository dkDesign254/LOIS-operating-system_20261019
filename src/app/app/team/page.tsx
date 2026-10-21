import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { inviteMember, revokeInvite } from '../actions'

export const metadata = { title: 'Team' }

const ROLES: Record<string, string> = {
  owner: 'Everything, including billing-level settings',
  admin: 'Manage people, keys and webhooks; review knowledge',
  reviewer: 'Review the knowledge bank and answer help requests',
  member: 'Ask, add documents, propose bank entries',
  viewer: 'Ask questions only',
}

export default async function Team() {
  const ctx = await requireWorkspace()
  const [{ data: members }, { data: invites }] = await Promise.all([
    ctx.sb.from('lois_memberships').select('user_id, role, created_at').eq('tenant_id', ctx.ws.tenant_id).order('created_at'),
    ctx.isAdmin ? ctx.sb.from('lois_invitations').select('invitation_id, email, role, expires_at, accepted_at').eq('tenant_id', ctx.ws.tenant_id).is('accepted_at', null) : Promise.resolve({ data: [] as { invitation_id: string; email: string; role: string; expires_at: string }[] }),
  ])

  return (
    <div className="stack">
      <div>
        <h1>Team</h1>
        <p className="muted">Invite clients and colleagues. They sign in with the invited email and join automatically.</p>
      </div>

      {ctx.isAdmin && (
        <div className="card">
          <h2>Invite someone</h2>
          <ActionForm action={inviteMember} submit="Invite">
            <div className="grid two">
              <div>
                <label htmlFor="e">Email</label>
                <input id="e" name="email" type="email" required maxLength={254} />
              </div>
              <div>
                <label htmlFor="r">Role</label>
                <select id="r" name="role" defaultValue="member">
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
          </ActionForm>
          {invites?.length ? (
            <table style={{ marginTop: '1rem' }}>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.invitation_id}>
                    <td>{i.email}</td>
                    <td>{i.role}</td>
                    <td className="muted">expires {new Date(i.expires_at).toLocaleDateString('en-GB')}</td>
                    <td>
                      <form action={revokeInvite}>
                        <input type="hidden" name="id" value={i.invitation_id} />
                        <button className="btn ghost small">Cancel</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      )}

      <div className="card">
        <h2>Members ({members?.length ?? 0})</h2>
        <table>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.user_id}>
                <td>
                  {m.user_id === ctx.user.id ? <b>You ({ctx.user.email})</b> : <span className="muted">Member …{m.user_id.slice(-6)}</span>}
                </td>
                <td>
                  <span className="chip">{m.role}</span>
                </td>
                <td className="muted">{new Date(m.created_at).toLocaleDateString('en-GB')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card soft">
        <h3>What each role can do</h3>
        <table>
          <tbody>
            {Object.entries(ROLES).map(([r, d]) => (
              <tr key={r}>
                <td>
                  <span className="chip">{r}</span>
                </td>
                <td className="muted">{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
