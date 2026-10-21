'use client'
import { useActionState, useRef, type ReactNode, type KeyboardEvent } from 'react'
import type { FormState, SandboxResult } from '@/app/app/actions'

export function ActionForm({
  action,
  submit,
  children,
  className,
  ghost,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  submit: string
  children: ReactNode
  className?: string
  ghost?: boolean
}) {
  const [state, run, pending] = useActionState(action, null)
  return (
    <form action={run} className={className}>
      {children}
      <div className="row" style={{ marginTop: '1rem' }}>
        <button className={`btn${ghost ? ' ghost' : ''}`} disabled={pending}>
          {pending ? 'Working…' : submit}
        </button>
      </div>
      {state?.error && (
        <p className="err" role="alert">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="ok" role="status">
          {state.message}
        </p>
      )}
      {state?.secret && <code className="secret">{state.secret}</code>}
    </form>
  )
}

/** Textarea that sends on Enter (Shift+Enter for a new line). */
export function Composer({
  action,
  hidden,
  defaultValue,
  placeholder,
}: {
  action: (fd: FormData) => void | Promise<void>
  hidden: Record<string, string>
  defaultValue?: string
  placeholder: string
}) {
  const form = useRef<HTMLFormElement>(null)
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      form.current?.requestSubmit()
    }
  }
  return (
    <form action={action} ref={form} className="composer">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className="box">
        <textarea name="question" required maxLength={4000} defaultValue={defaultValue} placeholder={placeholder} onKeyDown={onKey} aria-label="Your question" />
        <button className="btn" aria-label="Send">
          Ask
        </button>
      </div>
      <p className="muted small" style={{ margin: '0.4rem 0 0' }}>
        Enter to send · Shift+Enter for a new line. LOIS prepares and recommends; a person decides.
      </p>
    </form>
  )
}

export function SandboxForm({ action }: { action: (prev: SandboxResult, fd: FormData) => Promise<SandboxResult> }) {
  const [res, run, pending] = useActionState(action, null)
  return (
    <div className="stack">
      <form action={run} className="card">
        <label htmlFor="q">Scenario or question to test</label>
        <textarea id="q" name="q" required maxLength={1000} placeholder="e.g. Should we switch the onboarding checklist to the new template?" />
        <div className="row" style={{ marginTop: '1rem' }}>
          <button className="btn" disabled={pending}>
            {pending ? 'Running…' : 'Run dry run'}
          </button>
          <span className="muted small">Reads your approved knowledge. Saves nothing. Executes nothing.</span>
        </div>
        {res?.error && (
          <p className="err" role="alert">
            {res.error}
          </p>
        )}
      </form>

      {res?.ok && res.brief && (
        <>
          <div className="card navy">
            <div className="row">
              <span className="chip">SIMULATION</span>
              <span className="chip">execution: {res.brief.execution}</span>
            </div>
            <h2 style={{ marginTop: '0.75rem' }}>Decision brief (preview)</h2>
            <p>{res.brief.recommendation}</p>
            <p className="muted small">
              {res.brief.evidence_count} source{res.brief.evidence_count === 1 ? '' : 's'} found, {res.brief.verified_count} verified. {res.wouldAnswer}
            </p>
          </div>
          <div className="card">
            <h3>What retrieval returned</h3>
            {res.hits && res.hits.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Label</th>
                    <th>Score</th>
                    <th>Excerpt</th>
                  </tr>
                </thead>
                <tbody>
                  {res.hits.map((h, i) => (
                    <tr key={i}>
                      <td>
                        {h.title} <span className="muted small">({h.kind})</span>
                      </td>
                      <td>
                        <span className={`chip ${h.label}`}>{h.label}</span>
                      </td>
                      <td>{h.score}</td>
                      <td>{h.snippet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">No matching approved knowledge. In the live assistant this offers a human and logs the gap.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
