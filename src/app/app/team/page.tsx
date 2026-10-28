import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { inviteMember, revokeInvite, setGrant } from '../actions'
import { SubmitButton } from '@/components/submit-button'

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
  const [{ data: members }, { data: invites }, { data: dir }, { data: perms }, { data: grants }] = await Promise.all([
    ctx.sb.from('lois_memberships').select('user_id, role, created_at').eq('tenant_id', ctx.ws.tenant_id).order('created_at'),
    ctx.isAdmin ? ctx.sb.from('lois_invitations').select('invitation_id, email, role, expires_at, accepted_at').eq('tenant_id', ctx.ws.tenant_id).is('accepted_at', null) : Promise.resolve({ data: [] as { invitation_id: string; email: string; role: string; expires_at: string }[] }),
    ctx.isAdmin ? ctx.sb.rpc('lois_members_directory', { p_tenant: ctx.ws.tenant_id }) : Promise.resolve({ data: [] as { user_id: string; email: string; role: string }[] }),
    ctx.sb.from('lois_permissions').select('permission, service, description').order('service'),
    ctx.isAdmin ? ctx.sb.from('lois_member_grants').select('user_id, permission, effect, expires_at, reason').eq('tenant_id', ctx.ws.tenant_id) : Promise.resolve({ data: [] as { user_id: string; permission: string; effect: string; expires_at: string | null; reason: string | null }[] }),
  ])
  const emailOf = new Map((dir as { user_id: string; email: string }[] | null)?.map((d) => [d.user_id, d.email]) ?? [])
  const canManage = ctx.can('team.manage')

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
                        <SubmitButton className="btn ghost small">Cancel</SubmitButton>
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
                  {m.user_id === ctx.user.id ? <b>You ({ctx.user.email})</b> : <span>{emailOf.get(m.user_id) ?? <span className="muted">Member …{m.user_id.slice(-6)}</span>}</span>}
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

      {canManage && (
        <div className="card">
          <h2>Privileges by person</h2>
          <p className="muted small">Roles set the defaults. Here you can allow or deny one service for one person, optionally until a date. Every change is written to the audit trail. Owners cannot be restricted and you cannot change your own.</p>
          {(members ?? []).filter((m) => m.role !== 'owner' && m.user_id !== ctx.user.id).length === 0 && <p className="muted">Invite someone first.</p>}
          {(members ?? []).filter((m) => m.role !== 'owner' && m.user_id !== ctx.user.id).map((m) => (
            <details key={m.user_id} style={{ marginTop: '0.75rem' }}>
              <summary><b>{emailOf.get(m.user_id) ?? `Member …${m.user_id.slice(-6)}`}</b> <span className="chip">{m.role}</span> <span className="muted small">{(grants ?? []).filter((g) => g.user_id === m.user_id).length} override(s)</span></summary>
              <table style={{ marginTop: '0.5rem' }}>
                <tbody>
                  {(perms ?? []).map((p) => {
                    const g = (grants ?? []).find((x) => x.user_id === m.user_id && x.permission === p.permission)
                    return (
                      <tr key={p.permission}>
                        <td><b>{p.service}</b><br /><span className="muted small">{p.description}</span></td>
                        <td>{g ? <span className={`pill ${g.effect === 'allow' ? 'ok' : ''}`}>{g.effect}{g.expires_at ? ` until ${new Date(g.expires_at).toLocaleDateString('en-GB')}` : ''}</span> : <span className="muted small">role default</span>}</td>
                        <td>
                          <form action={setGrant} className="row">
                            <input type="hidden" name="user" value={m.user_id} />
                            <input type="hidden" name="perm" value={p.permission} />
                            <select name="effect" defaultValue="clear" aria-label="Effect">
                              <option value="clear">Role default</option>
                              <option value="allow">Allow</option>
                              <option value="deny">Deny</option>
                            </select>
                            <input name="expires" type="date" aria-label="Until" />
                            <SubmitButton className="btn ghost small">Save</SubmitButton>
                          </form>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </details>
          ))}
          <p className="muted small" style={{ marginTop: '0.75rem' }}>Deny is enforced everywhere in the app. Allow beyond a person&apos;s role is enforced by the database today for recording decisions; other services follow the role until their rules are moved onto privileges.</p>
        </div>
      )}

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
