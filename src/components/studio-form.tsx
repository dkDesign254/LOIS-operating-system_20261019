'use client'
import { useActionState, useState } from 'react'
import type { StudioState } from '@/app/app/studio-actions'

const MODES = [
  { id: 'auto', label: 'Auto', hint: 'LOIS picks the best connected model for the job and hands off if it fails.' },
  { id: 'compare', label: 'Compare', hint: 'The same request on up to three models, side by side.' },
  { id: 'chain', label: 'Chain', hint: 'Plan, then draft, then check, each by a different model where possible.' },
] as const

export function StudioForm({ action, session, tasks, disabled }: { action: (p: StudioState, fd: FormData) => Promise<StudioState>; session?: string; tasks: Record<string, string>; disabled?: string }) {
  const [state, run, pending] = useActionState(action, null)
  const [mode, setMode] = useState<(typeof MODES)[number]['id']>('auto')
  return (
    <form action={run} className="card">
      {session && <input type="hidden" name="session" value={session} />}
      <input type="hidden" name="mode" value={mode} />
      <div className="tabs" role="tablist" aria-label="Mode">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={mode === m.id} className={`choice`} style={{ width: 'auto', marginTop: 0 }} aria-pressed={mode === m.id} onClick={() => setMode(m.id)}>{m.label}</button>
        ))}
      </div>
      <p className="muted small">{MODES.find((m) => m.id === mode)!.hint}</p>
      <label htmlFor="q">Your request</label>
      <textarea id="q" name="q" rows={4} required minLength={3} maxLength={8000} placeholder="e.g. Plan how we onboard a new client, then draft the welcome email." disabled={Boolean(disabled)} />
      <div className="row" style={{ marginTop: '0.75rem' }}>
        <label htmlFor="task" className="small" style={{ margin: 0 }}>Job type</label>
        <select id="task" name="task" defaultValue="" style={{ width: 'auto' }}>
          <option value="">Detect automatically</option>
          {Object.entries(tasks).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn" disabled={pending || Boolean(disabled)}>{pending ? 'Working…' : 'Send'}</button>
      </div>
      {disabled && <p className="err" role="alert">{disabled}</p>}
      {state?.error && <p className="err" role="alert">{state.error}</p>}
    </form>
  )
}
