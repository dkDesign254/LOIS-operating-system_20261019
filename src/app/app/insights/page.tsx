import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireWorkspace } from '@/lib/session'
import { Bars } from '@/components/bars'
import { SECTION_LABEL } from '@/lib/rail'

export const metadata = { title: 'Insights' }

type Ins = {
  days: number
  members: Record<string, number>
  active_users: number
  daily: { day: string; asks: number; studio: number; scans: number; decisions: number }[]
  bank: { by_status: Record<string, number>; by_domain: { domain: string; n: number }[]; by_label: Record<string, number>; oldest_pending_days: number }
  help: { open: number; resolved: number; avg_hours_to_resolve: number | null }
  asks: { by_mode: Record<string, number>; ratings: Record<string, number> }
  models: { provider: string; model: string; calls: number; ok: number; avg_ms: number }[]
  scans: { count: number }
  sections: { section: string; visits: number }[] | null
}

const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)
const WINDOWS = [7, 30, 90]

export default async function Insights({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  if (!ctx.isAdmin) notFound()
  const days = WINDOWS.includes(Number(sp.d)) ? Number(sp.d) : 30
  const { data, error } = await ctx.sb.rpc('lois_insights', { p_tenant: ctx.ws.tenant_id, p_days: days })
  if (error || !data) return <div className="stack"><h1>Insights</h1><p className="err">Insights could not be loaded: {error?.message ?? 'no data'}.</p></div>
  const i = data as Ins
  const total = (k: 'asks' | 'studio' | 'scans' | 'decisions') => i.daily.reduce((a, d) => a + d[k], 0)
  const up = i.asks.ratings['1'] ?? 0, down = i.asks.ratings['-1'] ?? 0
  const pending = i.bank.by_status.pending_review ?? 0
  const verified = i.bank.by_label.verified ?? 0, approved = i.bank.by_status.approved ?? 0

  const tiles = [
    { t: 'People in this workspace', v: sum(i.members), d: Object.entries(i.members).map(([r, n]) => `${n} ${r}`).join(', ') },
    { t: `Active in ${days} days`, v: i.active_users, d: 'Asked, used Studio or ran a scan' },
    { t: 'Questions asked', v: total('asks'), d: down ? `${up} helpful, ${down} not helpful` : `${up} helpful ratings` },
    { t: 'Studio requests', v: total('studio'), d: 'Across all models' },
    { t: 'Review decisions', v: total('decisions'), d: pending ? `${pending} still waiting` : 'Queue is clear' },
    { t: 'Website scans', v: i.scans.count, d: 'Agent readiness' },
  ]
  const notes: string[] = []
  if (pending > 0) notes.push(`${pending} knowledge entr${pending === 1 ? 'y has' : 'ies have'} waited up to ${i.bank.oldest_pending_days} day(s) for review.`)
  if (approved > 0 && verified === 0) notes.push(`None of the ${approved} accepted entries is labelled "verified". They are all "reported", so answers rest on unconfirmed sources. Verify the ones you can check.`)
  if (i.help.open > 0) notes.push(`${i.help.open} help request${i.help.open === 1 ? ' is' : 's are'} still open.`)
  if (down > up && down > 0) notes.push('More answers were rated not helpful than helpful. Check the questions that found no match and add accepted entries for them.')
  const bad = i.models.filter((m) => m.calls >= 5 && m.ok / m.calls < 0.8)
  for (const m of bad) notes.push(`${m.provider} (${m.model}) failed ${m.calls - m.ok} of ${m.calls} calls. Auto mode is handing those over to other models.`)

  return (
    <div className="stack">
      <div>
        <h1>Insights</h1>
        <p className="muted">Counts only, for owners and admins of this workspace. No message text, names or emails appear here. Updated each time you open the page.</p>
        <div className="tabs">{WINDOWS.map((w) => <Link key={w} href={`/app/insights?d=${w}`} aria-current={w === days}>{w} days</Link>)}</div>
      </div>

      <ul className="plainlist" style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
        {tiles.map((t) => (
          <li key={t.t} className="card"><p className="muted small" style={{ margin: 0 }}>{t.t}</p><p style={{ fontSize: '1.8rem', margin: '0.2rem 0' }}><b>{t.v}</b></p><p className="muted small" style={{ margin: 0 }}>{t.d}</p></li>
        ))}
      </ul>

      {notes.length > 0 && (
        <section className="card" aria-labelledby="n-h"><h2 id="n-h" className="mono">What needs attention</h2><ul>{notes.map((n) => <li key={n}>{n}</li>)}</ul></section>
      )}

      <section className="card"><h2 className="mono">Activity per day</h2>
        <Bars label={`Daily activity over ${days} days`} data={i.daily.map((d) => ({ label: d.day, value: d.asks + d.studio + d.scans + d.decisions }))} />
      </section>

      <div className="grid two">
        <section className="card"><h2 className="mono">Knowledge bank</h2>
          <ul className="plainlist">{Object.entries(i.bank.by_status).map(([s, n]) => <li key={s}>{s.replace('_', ' ')}: <b>{n}</b></li>)}</ul>
          <h3 className="mono small">Accepted, by topic</h3>
          <ul className="plainlist">{i.bank.by_domain.map((d) => <li key={d.domain}>{d.domain}: <b>{d.n}</b></li>)}</ul>
          <p className="small"><Link href="/app/bank">Open the Knowledge bank</Link></p>
        </section>
        <section className="card"><h2 className="mono">How answers were given</h2>
          <ul className="plainlist">{Object.entries(i.asks.by_mode).map(([m, n]) => <li key={m}>{m}: <b>{n}</b></li>)}{!Object.keys(i.asks.by_mode).length && <li className="muted">No questions in this period.</li>}</ul>
          <h3 className="mono small">Help requests</h3>
          <p className="small">{i.help.open} open, {i.help.resolved} resolved{i.help.avg_hours_to_resolve != null ? `, about ${i.help.avg_hours_to_resolve} h to resolve` : ''}.</p>
        </section>
      </div>

      <section className="card"><h2 className="mono">Models</h2>
        {i.models.length ? (
          <table className="small"><thead><tr><th>Provider</th><th>Model</th><th>Calls</th><th>Worked</th><th>Average time</th></tr></thead>
            <tbody>{i.models.map((m) => <tr key={m.provider + m.model}><td>{m.provider}</td><td>{m.model}</td><td>{m.calls}</td><td>{Math.round((m.ok / m.calls) * 100)}%</td><td>{m.avg_ms} ms</td></tr>)}</tbody></table>
        ) : <p className="muted">No Studio requests in this period.</p>}
      </section>

      <section className="card"><h2 className="mono">Where people spend time</h2>
        {i.sections === null ? <p className="muted">Shown once at least 3 people are in the workspace, so no one person&apos;s habits are exposed.</p>
          : i.sections.length ? <ul className="plainlist">{i.sections.map((s) => <li key={s.section}>{SECTION_LABEL[s.section] ?? s.section}: <b>{s.visits}</b> visits</li>)}</ul> : <p className="muted">No visits counted yet.</p>}
      </section>
    </div>
  )
}
