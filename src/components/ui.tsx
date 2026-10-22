import type { ReactNode } from 'react'

export type Tone = 'ok' | 'warn' | 'crit' | 'info' | 'none'
export const Pill = ({ tone = 'none', children }: { tone?: Tone; children: ReactNode }) => <span className={`pill ${tone}`}>{children}</span>

export function Guide({ what, doit, dont, open }: { what: ReactNode; doit: ReactNode; dont: ReactNode; open?: boolean }) {
  return (
    <details className="guide" open={open}>
      <summary>What am I looking at?</summary>
      <div className="gb">
        <div><b>What this is</b>{what}</div>
        <div><b>What to do here</b>{doit}</div>
        <div><b>What to avoid</b>{dont}</div>
      </div>
    </details>
  )
}

export const Tile = ({ k, v, s, pill }: { k: string; v: ReactNode; s?: string; pill?: [Tone, string] }) => (
  <div className="tile">
    <div className="k">{k}</div>
    <div className="v">{v}</div>
    <div className="s">{pill && <Pill tone={pill[0]}>{pill[1]}</Pill>} {s}</div>
  </div>
)

export const fmt = (ts: string | null) => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
export const sevTone = (s: string): Tone => (s === 'crit' || s === 'failing' ? 'crit' : s === 'warn' || s === 'degraded' ? 'warn' : s === 'info' ? 'info' : s === 'ok' || s === 'healthy' ? 'ok' : 'none')
