import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { Icon } from '@/components/icons'
import { MEASURES, type Action, type Check } from '@/lib/scan'
import { scanSite, deleteScan } from './actions'

export const metadata = { title: 'Agent readiness' }

const band = (n: number) => (n >= 80 ? 'ok' : n >= 55 ? 'warn' : 'crit')
const word = (n: number) => (n >= 80 ? 'Strong' : n >= 55 ? 'Needs work' : 'Weak')
const lvl = (n: number) => ['', 'Low', 'Medium', 'High'][n]

export default async function Readiness({ searchParams }: { searchParams: Promise<{ scan?: string; error?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  const { data: scans } = await ctx.sb
    .from('lois_readiness_scans')
    .select('scan_id, url, host, scores, created_at')
    .eq('tenant_id', ctx.ws.tenant_id)
    .order('created_at', { ascending: false })
    .limit(20)
  const pick = sp.scan ?? scans?.[0]?.scan_id
  const { data: cur } = pick ? await ctx.sb.from('lois_readiness_scans').select('*').eq('scan_id', pick).maybeSingle() : { data: null }
  const scores = (cur?.scores ?? {}) as Record<keyof typeof MEASURES, number>
  const checks = (cur?.checks ?? []) as Check[]
  const actions = (cur?.actions ?? []) as Action[]

  return (
    <div className="stack">
      <div>
        <h1>Agent readiness</h1>
        <p className="muted">How well can people, search engines and AI agents find, read and trust a website? Enter an address and LOIS checks it, scores four measures and lists what to fix first. It reads one public page and three standard files. It changes nothing.</p>
        <form action={scanSite} className="row" style={{ marginTop: 8 }}>
          <div className="grow" style={{ minWidth: 220 }}>
            <label htmlFor="url">Website address</label>
            <input id="url" name="url" type="text" inputMode="url" placeholder="yourcompany.com" required maxLength={300} />
          </div>
          <button className="btn" style={{ alignSelf: 'flex-end' }}>Check this site</button>
        </form>
        {sp.error && <p className="err" role="alert">{sp.error}</p>}
      </div>

      {cur ? (
        <>
          <div className="card soft">
            <p className="small muted" style={{ margin: 0 }}>Checked {new Date(cur.created_at).toLocaleString('en-GB')}</p>
            <h2 style={{ marginTop: 0, wordBreak: 'break-all' }}>{cur.host}</h2>
            <div className="strip">
              {(Object.keys(MEASURES) as (keyof typeof MEASURES)[]).map((k) => (
                <div className="tile" key={k}>
                  <div className="k">{MEASURES[k].label}</div>
                  <div className="v">{scores[k] ?? 0}<span className="small muted">/100</span></div>
                  <div className="progress" aria-hidden="true"><i style={{ width: `${scores[k] ?? 0}%` }} /></div>
                  <div className="s" style={{ marginTop: 6 }}><span className={`pill ${band(scores[k] ?? 0)}`}>{word(scores[k] ?? 0)}</span> {MEASURES[k].text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2>Fix these first</h2>
            {actions.length ? (
              <ol className="list" style={{ listStyle: 'decimal inside' }}>
                {actions.map((a) => (
                  <li key={a.id}>
                    <div className="l">
                      <b>{a.title}</b>
                      <div className="small muted">{a.why}</div>
                      <div className="row small" style={{ marginTop: 4 }}>
                        <span className="pill info">Impact {lvl(a.impact)}</span>
                        <span className="pill none">Effort {lvl(a.effort)}</span>
                        <Link href={`/resources/${a.guide}`}>How to fix this</Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty"><Icon name="shield" /><p>Nothing to fix. This page passes every check we run.</p></div>
            )}
          </div>

          <details className="card">
            <summary>All {checks.length} checks</summary>
            <div className="scroll">
              <table>
                <thead><tr><th>Measure</th><th>Check</th><th>Result</th><th>Detail</th></tr></thead>
                <tbody>
                  {checks.map((c) => (
                    <tr key={c.id}>
                      <td className="muted">{MEASURES[c.measure].label}</td>
                      <td>{c.label}</td>
                      <td><span className={`pill ${c.ok ? 'ok' : 'warn'}`}>{c.ok ? 'Pass' : 'Fix'}</span></td>
                      <td className="muted">{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
          <p className="small muted">A scan reflects one page at one moment, fetched from our server. Pages that load content only after scripts run may score lower than they look to a person. A person decides what to change.</p>
        </>
      ) : (
        <div className="card empty"><Icon name="spark" /><p>No scans yet. Enter a website address above to start.</p></div>
      )}

      {scans && scans.length > 0 && (
        <div className="card">
          <h2>Earlier scans</h2>
          <ul className="list">
            {scans.map((s) => {
              const sc = s.scores as Record<string, number>
              return (
                <li key={s.scan_id}>
                  <div className="l">
                    <Link href={`/app/readiness?scan=${s.scan_id}`}>{s.host}</Link>
                    <div className="small muted">{new Date(s.created_at).toLocaleDateString('en-GB')} · Discovery {sc.discovery} · Access {sc.access} · Usability {sc.usability} · Trust {sc.trust}</div>
                  </div>
                  <form action={deleteScan}><input type="hidden" name="id" value={s.scan_id} /><button className="btn ghost small">Delete</button></form>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
