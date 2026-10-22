'use client'
import { useActionState, useEffect, useState } from 'react'
import { briefMe, runDemo, type GenState } from '@/app/app/control-actions'
import type { Demo } from '@/lib/learn'

export function BriefMe() {
  const [s, run, pending] = useActionState<GenState>(briefMe, null)
  return (
    <div>
      <form action={run}>
        <button className="btn small" disabled={pending}>{pending ? 'Thinking…' : 'Brief me'}</button>
      </form>
      {s?.error && <p className="muted small" style={{ marginTop: 8 }}>{s.error}</p>}
      {s?.text && <div className="out" style={{ marginTop: 8 }}>{s.text}</div>}
      {!s && <p className="muted small" style={{ marginTop: 8 }}>LOIS reads your actions, pending decisions, automations and memory and tells you what matters, what it recommends and what it cannot yet see.</p>}
    </div>
  )
}

export function DemoCard({ demo, rate }: { demo: Demo; rate: (fd: FormData) => void | Promise<void> }) {
  const [s, run, pending] = useActionState<GenState, FormData>(runDemo, null)
  const [copied, setCopied] = useState(false)
  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div>
          <h3>{demo.title}</h3>
          <div className="muted small">For: {demo.who}</div>
        </div>
        <span className="pill info">Simulation</span>
      </div>
      <p className="muted"><b style={{ color: 'var(--ink)' }}>The problem.</b> {demo.problem}</p>
      <form action={run}>
        <input type="hidden" name="demo" value={demo.id} />
        <label htmlFor={`in_${demo.id}`}>Sample input (edit it)</label>
        <textarea id={`in_${demo.id}`} name="input" defaultValue={demo.input} maxLength={6000} />
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" disabled={pending}>{pending ? 'Working…' : 'Run it'}</button>
        </div>
      </form>
      {s?.error && <p className="muted small" style={{ marginTop: 8 }}>{s.error}</p>}
      {s?.text && (
        <div style={{ marginTop: 10 }}>
          <div className="out">{s.text}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <form action={rate}><input type="hidden" name="demo" value={demo.id} /><input type="hidden" name="v" value="up" /><button className="btn ghost small">Useful</button></form>
            <form action={rate}><input type="hidden" name="demo" value={demo.id} /><input type="hidden" name="v" value="down" /><button className="btn ghost small">Not useful</button></form>
            <button type="button" className="btn ghost small" onClick={() => { navigator.clipboard?.writeText(s.text ?? '').then(() => setCopied(true)).catch(() => {}); setTimeout(() => setCopied(false), 1500) }}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        </div>
      )}
      <details className="measure">
        <summary><b>What it would do in Make</b></summary>
        <ul className="tight">{demo.flow.map(([a, b]) => <li key={a}><b>{a}:</b> {b}</li>)}</ul>
        <p className="muted small" style={{ marginTop: 8 }}>What to measure: {demo.measure}</p>
        <details style={{ marginTop: 8 }}>
          <summary className="small">The instruction LOIS uses (copy it to use in any AI tool)</summary>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{demo.prompt}</pre>
        </details>
      </details>
    </section>
  )
}

const STEPS: [string, string][] = [
  ['Read the Start here actions', '/app/control'],
  ['Open Sandbox and run one tool', '/app/sandbox'],
  ['Rate the result', '/app/sandbox'],
  ['Add a fact or lesson to Memory', '/app/memory'],
  ['Ask LOIS one question', '/app'],
]
export function Tour() {
  const [done, setDone] = useState<Record<number, boolean>>({})
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem('lois-tour') || '{}')) } catch { /* private window */ }
  }, [])
  const toggle = (i: number) => {
    const next = { ...done, [i]: !done[i] }
    setDone(next)
    try { localStorage.setItem('lois-tour', JSON.stringify(next)) } catch { /* ignore */ }
  }
  const n = STEPS.filter((_, i) => done[i]).length
  return (
    <section className="card">
      <div className="row" style={{ justifyContent: 'space-between' }}><h3>Five-minute tour</h3><span className="muted small">{n} of 5 done. Saved on this device only.</span></div>
      <ul className="list">
        {STEPS.map(([t, href], i) => (
          <li key={t}>
            <div className="l"><b>{done[i] ? '✓ ' : ''}{t}</b></div>
            <div className="row"><a className="btn ghost small" href={href}>Go</a><button type="button" className="btn small" onClick={() => toggle(i)}>{done[i] ? 'Undo' : 'Done'}</button></div>
          </li>
        ))}
      </ul>
    </section>
  )
}
