import { requireWorkspace } from '@/lib/session'
import { Guide, Pill, Tile, sevTone } from '@/components/ui'

export const metadata = { title: 'Automations' }
const LABEL: Record<string, string> = { failing: 'Failing', degraded: 'Degraded', unverified: 'Not verified', healthy: 'Healthy' }

export default async function Automations() {
  const ctx = await requireWorkspace()
  const { data: rows } = await ctx.sb.from('lois_scenarios').select('scenario_id, make_id, name, folder, is_on, last_run, state, plain, action, source, checked_at').eq('tenant_id', ctx.ws.tenant_id).order('folder').order('name')
  const list = rows ?? []
  const on = list.filter((r) => r.is_on).length
  const source = list[0]?.source
  return (
    <div className="stack">
      <div>
        <h1>Automations</h1>
        <p className="muted">Every Make scenario in the LUCRE folder with its latest recorded state.</p>
      </div>
      <Guide
        what="The automated workflows (Make scenarios) that run the OS, with a plain-words explanation of each."
        doit="Fix red items first. For each row, do the follow-up shown. Confirm who owns any row marked 'Built by another session'."
        dont="Do not switch a scenario on because it looks finished: it needs a passing regression run first. Quarantine, do not delete."
      />
      <div className="strip">
        <Tile k="Switched on" v={list.length ? on : '—'} s="Make scheduling flag" />
        <Tile k="Switched off" v={list.length ? list.length - on : '—'} />
        <Tile k="Last run failed" v={list.length ? list.filter((r) => r.state === 'failing').length : '—'} pill={['crit', 'Attention']} />
        <Tile k="Certified" v={0} s="no regression run has passed" pill={['warn', 'Uncertified']} />
      </div>
      <section className="card scroll">
        {list.length ? (
          <table>
            <thead><tr><th>Scenario</th><th>State</th><th>Last run</th><th>In plain words</th><th>Do this</th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.scenario_id} className={`sev ${sevTone(s.state)}`}>
                  <td><b>{s.name}</b><div className="muted small">#{s.make_id} · LUCRE/{s.folder}</div></td>
                  <td><Pill tone={s.is_on ? 'ok' : 'none'}>{s.is_on ? 'On' : 'Off'}</Pill> <Pill tone={sevTone(s.state)}>{LABEL[s.state]}</Pill></td>
                  <td>{s.last_run}</td>
                  <td>{s.plain}</td>
                  <td>{s.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No automations are registered in this workspace.</p>
        )}
      </section>
      <p className="muted small">{source ? `Source: ${source}. ` : ''}These states are a recorded snapshot, not a live feed. "On" is Make's scheduling flag; it does not mean the scenario succeeded. Naming: LOIS-AREA-Purpose-vX.Y.</p>
    </div>
  )
}
