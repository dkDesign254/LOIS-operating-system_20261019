type T = { turn_id: string; role: string; mode: string | null; task: string | null; model: string | null; provider: string | null; step: string | null; ok: boolean; latency_ms: number | null; reason: string | null; content: string; created_at: string }

// A plain record of what happened in each request: which model was asked, in what order, how long it took, and where work was handed on.
export function RunTrace({ turns }: { turns: T[] }) {
  const runs: { q: T; steps: T[] }[] = []
  for (const t of turns) {
    if (t.role === 'user') runs.push({ q: t, steps: [] })
    else runs[runs.length - 1]?.steps.push(t)
  }
  if (!runs.length) return null
  return (
    <details className="card">
      <summary>Run trace ({runs.length} request{runs.length === 1 ? '' : 's'})</summary>
      <p className="small muted">Every request, in order. A failed step means LOIS handed the work to the next model so you did not have to.</p>
      {runs.map((r, i) => {
        const ms = r.steps.reduce((s, x) => s + (x.latency_ms ?? 0), 0)
        const fails = r.steps.filter((s) => !s.ok).length
        return (
          <div key={r.q.turn_id} style={{ marginTop: '0.75rem' }}>
            <b className="small">Request {i + 1}</b> <span className="pill info">{r.q.mode ?? 'auto'}</span> <span className="small muted">{r.q.task ?? ''} · {r.steps.length} step{r.steps.length === 1 ? '' : 's'} · {(ms / 1000).toFixed(1)} s{fails ? ` · ${fails} hand-off${fails === 1 ? '' : 's'}` : ''}</span>
            <ol className="small" style={{ margin: '0.35rem 0 0', paddingLeft: '1.2rem' }}>
              {r.steps.map((s, j) => (
                <li key={s.turn_id}>
                  <span className={`pill ${s.ok ? 'ok' : 'warn'}`}>{s.ok ? 'answered' : 'passed on'}</span> {s.step && s.step !== 'answer' ? `${s.step}: ` : ''}<b>{s.model ?? s.provider ?? 'LOIS'}</b>{s.latency_ms ? ` · ${(s.latency_ms / 1000).toFixed(1)} s` : ''}
                  {!s.ok && r.steps[j + 1] ? <span className="muted"> → handed to {r.steps[j + 1].model ?? 'the next model'}</span> : null}
                  {s.reason ? <div className="muted">{s.reason.slice(0, 200)}</div> : null}
                </li>
              ))}
            </ol>
          </div>
        )
      })}
    </details>
  )
}
