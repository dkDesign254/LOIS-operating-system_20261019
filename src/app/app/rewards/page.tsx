import { requireWorkspace } from '@/lib/session'
import { Icon } from '@/components/icons'

export const metadata = { title: 'Rewards' }

const LABELS: Record<string, string> = {
  document: 'Documents added',
  feedback: 'Feedback given',
  'bank.accepted': 'Entries accepted into the bank',
  'bank.reviewed': 'Entries reviewed',
}

export default async function Rewards() {
  const ctx = await requireWorkspace()
  const { data: events } = await ctx.sb
    .from('lois_points_events')
    .select('kind, points, created_at')
    .eq('tenant_id', ctx.ws.tenant_id)
    .order('created_at', { ascending: false })
    .limit(1000)
  const { data: board } = await ctx.sb.rpc('lois_leaderboard', { p_tenant: ctx.ws.tenant_id })

  const total = (events ?? []).reduce((s, e) => s + e.points, 0)
  const weekAgo = Date.now() - 7 * 864e5
  const week = (events ?? []).filter((e) => new Date(e.created_at).getTime() > weekAgo).length
  const target = 5
  const byKind = new Map<string, { n: number; pts: number }>()
  for (const e of events ?? []) {
    const cur = byKind.get(e.kind) ?? { n: 0, pts: 0 }
    byKind.set(e.kind, { n: cur.n + 1, pts: cur.pts + e.points })
  }

  return (
    <div className="stack">
      <div>
        <h1>Rewards</h1>
        <p className="muted">Points for making the knowledge better: adding documents, giving feedback, and having entries accepted or reviewing them.</p>
      </div>
      <div className="grid two">
        <div className="card navy">
          <div className="muted">Your points</div>
          <div className="stat">{total}</div>
        </div>
        <div className="card">
          <div className="row">
            <Icon name="trophy" style={{ width: 22, height: 22, color: 'var(--blue)' }} />
            <b>Weekly challenge: make {target} contributions</b>
          </div>
          <div className="progress" style={{ margin: '0.75rem 0 0.4rem' }}>
            <i style={{ width: `${Math.min(100, (week / target) * 100)}%` }} />
          </div>
          <span className="muted small">
            {Math.min(week, target)}/{target} this week
          </span>
        </div>
      </div>

      <div className="card">
        <h2>Where your points came from</h2>
        {byKind.size ? (
          <table>
            <tbody>
              {[...byKind.entries()].map(([k, v]) => (
                <tr key={k}>
                  <td>{LABELS[k] ?? k}</td>
                  <td className="muted">{v.n}×</td>
                  <td>
                    <b>{v.pts}</b> pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">No points yet. Add a document or rate an answer to get started.</p>
        )}
      </div>

      <div className="card">
        <h2>Leaderboard</h2>
        <p className="muted small">Only people who opted in on their profile appear here.</p>
        {board?.length ? (
          <table>
            <tbody>
              {board.map((r: { user_id: string; display_name: string; points: number }, i: number) => (
                <tr key={r.user_id}>
                  <td>{i + 1}</td>
                  <td>{r.display_name}</td>
                  <td>
                    <b>{r.points}</b> pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Nobody has opted in yet.</p>
        )}
      </div>
    </div>
  )
}
