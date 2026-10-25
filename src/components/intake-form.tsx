'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { intakeFiles, type IntakeState } from '@/app/app/intake/actions'

export function IntakeForm({ projects, canAdd }: { projects: { project_id: string; name: string }[]; canAdd: boolean }) {
  const [state, run, pending] = useActionState<IntakeState, FormData>(intakeFiles, null)
  return (
    <>
      <form action={run}>
        <div className="field">
          <label htmlFor="files">Files (PDF, photo or scan, .txt, .md, .csv, .json, .html)</label>
          <input id="files" name="files" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,.json,.html,.htm" disabled={!canAdd} required />
          <p className="small muted">Up to 4 files, 3.5 MB each. Photos and scans are read with AI when a Google key is connected.</p>
        </div>
        <div className="grid two">
          <div>
            <label htmlFor="label">How much do you trust these?</label>
            <select id="label" name="label" defaultValue="reported">
              <option value="reported">Reported (from a source, not checked)</option>
              <option value="verified">Verified (a person checked it)</option>
              <option value="example">Example (illustrative)</option>
            </select>
          </div>
          <div>
            <label htmlFor="project">Project (optional)</label>
            <select id="project" name="project" defaultValue="">
              <option value="">None</option>
              {projects.map((p) => <option key={p.project_id} value={p.project_id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: '1rem' }}>
          <button className="btn" disabled={pending || !canAdd}>{pending ? 'Reading your files…' : 'Read and add'}</button>
        </div>
        {state?.error && <p className="err" role="alert">{state.error}</p>}
      </form>
      {state?.rows && (
        <div className="card soft" role="status" style={{ marginTop: '1rem' }}>
          <h2>Result</h2>
          <ul className="list">
            {state.rows.map((r) => (
              <li key={r.stored}>
                <div className="l">
                  <b>{r.file}</b> <span className={`pill ${r.status === 'added' ? 'ok' : r.status === 'duplicate' ? 'none' : 'warn'}`}>{r.status}</span>
                  {r.flagged && r.status === 'added' && <span className="pill warn" style={{ marginLeft: 6 }}>needs a careful look</span>}
                  <div className="small muted">Saved as {r.stored}{r.passages ? ` · ${r.passages} passage${r.passages === 1 ? '' : 's'}` : ''}{r.confidence != null ? ` · AI confidence ${Math.round(r.confidence * 100)}%` : ''}</div>
                  {r.note && <div className="small">{r.note}</div>}
                </div>
              </li>
            ))}
          </ul>
          <p className="small">A summary for each file is waiting in the <Link href="/app/bank">knowledge bank</Link> for a person to accept or reject.</p>
        </div>
      )}
    </>
  )
}
