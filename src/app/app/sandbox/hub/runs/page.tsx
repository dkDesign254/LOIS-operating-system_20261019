import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { SubmitButton } from '@/components/submit-button'
import { decideRun, recordResult, proposeLearning } from '../actions'
import type { RunRecord } from '@/lib/run-record'

export const metadata = { title: 'Runs' }
const STATUS: Record<string, string> = { simulated: 'test (nothing sent)', awaiting_approval: 'waiting for approval', rejected: 'rejected', sent: 'sent, waiting for result', succeeded: 'finished', failed: 'failed', cancelled: 'cancelled' }
type Run = { run_id: string; user_id: string; mode: string; status: string; why: string | null; input: Record<string, string>; record: RunRecord & { simulation?: { step: string; example: string }[] }; result: { text?: string; label?: string } | null; error: string | null; approval_note: string | null; created_at: string; use_case_id: string }

export default async function Runs({ searchParams }: { searchParams: Promise<{ run?: string; error?: string; done?: string; requested?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  const { data: all } = await ctx.sb.from('lois_runs').select('run_id,user_id,mode,status,why,input,record,result,error,approval_note,created_at,use_case_id').eq('tenant_id', ctx.ws.tenant_id).order('created_at', { ascending: false }).limit(50)
  const { data: ucs } = await ctx.sb.from('lois_use_cases').select('use_case_id,title')
  const title = (id: string) => ucs?.find((x) => x.use_case_id === id)?.title ?? 'Use case'
  const runs = (all ?? []) as Run[]
  const cur = runs.find((r) => r.run_id === sp.run)
  const rec = cur?.record
  const canDecide = ctx.isAdmin && cur?.status === 'awaiting_approval' && cur.user_id !== ctx.user.id
  const DONE: Record<string, string> = { approved: 'Approved and sent to your connector.', rejected: 'Rejected.', recorded: 'Result recorded.', proposed: 'Proposed to the Knowledge bank for review.' }

  return (
    <div className="stack">
      <p className="small"><Link href="/app/sandbox/hub">← Use case hub</Link></p>
      <h1>Runs</h1>
      {sp.error && <p className="err" role="alert">{sp.error}</p>}
      {sp.done && <p className="ok" role="status">{DONE[sp.done] ?? 'Done.'}</p>}
      {sp.requested && <p className="ok" role="status">Requested. An owner or admin who is not you must approve it before anything is sent.</p>}

      {cur && rec && (
        <article className="card" aria-labelledby="run-h">
          <p className="marker mono">{cur.mode === 'test' ? 'TEST RUN' : 'LIVE RUN'} · {STATUS[cur.status]}</p>
          <h2 id="run-h">{title(cur.use_case_id)}</h2>
          <dl className="small">
            <dt><b>What</b></dt><dd>{rec.what}</dd>
            <dt><b>When</b></dt><dd>{rec.when}</dd>
            <dt><b>Why</b></dt><dd>{rec.why}</dd>
            <dt><b>How</b></dt><dd>{rec.how}</dd>
            <dt><b>What to expect</b></dt><dd>{rec.expect}</dd>
            <dt><b>How we will know</b></dt><dd>{rec.measure}</dd>
            <dt><b>How accurate is this?</b></dt><dd><span className="chip">{rec.accuracy.level}</span> {rec.accuracy.note}</dd>
          </dl>
          {rec.effects.length > 0 && <><h3 className="mono small">What it affects</h3><ul>{rec.effects.map((e) => <li key={e}>{e}</li>)}</ul></>}
          {cur.record.simulation && <><h3 className="mono small">Example output, step by step</h3><ol>{cur.record.simulation.map((s) => <li key={s.step}><b>{s.step}</b>: {s.example}</li>)}</ol><p className="muted small">These are examples built from what you typed. They are not real results.</p></>}
          {cur.error && <p className="err">{cur.error}</p>}
          {cur.approval_note && <p className="small">Approver's note: {cur.approval_note}</p>}
          {cur.result?.text && <p className="callout small">Result ({cur.result.label ?? 'reported by your automation'}): {cur.result.text}</p>}
          {cur.result && !cur.result.text && <p className="callout small">Result reported by your automation: <code>{JSON.stringify(cur.result).slice(0, 600)}</code> (reported, not yet verified)</p>}

          <h3 className="mono small">What you can do now</h3>
          <ul>{rec.options.map((o) => <li key={o}>{o}</li>)}</ul>

          {canDecide && (
            <form className="stack"><label htmlFor="note">Your note (needed)</label><input id="note" name="note" maxLength={300} /><input type="hidden" name="run" value={cur.run_id} />
              <div className="row" style={{ gap: '0.5rem' }}><SubmitButton className="btn" formAction={decideRun} name="decision" value="approve" pendingText="Sending…">Approve and send</SubmitButton><SubmitButton className="btn ghost" formAction={decideRun} name="decision" value="reject" pendingText="Saving…">Reject</SubmitButton></div></form>
          )}
          {cur.status === 'awaiting_approval' && cur.user_id === ctx.user.id && <p className="callout small">You asked for this run, so a different owner or admin has to approve it.</p>}
          {cur.status === 'sent' && (ctx.isAdmin || cur.user_id === ctx.user.id) && (
            <form className="stack"><label htmlFor="text">Record what happened (after checking)</label><input id="text" name="text" maxLength={2000} /><input type="hidden" name="run" value={cur.run_id} /><SubmitButton className="btn ghost" formAction={recordResult} pendingText="Saving…">Record the result</SubmitButton></form>
          )}
          {cur.status !== 'awaiting_approval' && (
            <form className="stack"><h3 className="mono small">Teach LOIS</h3><label htmlFor="lt">Title</label><input id="lt" name="title" maxLength={200} defaultValue={`Learning from ${title(cur.use_case_id)}`} /><label htmlFor="lc">What did this teach you?</label><textarea id="lc" name="content" rows={3} maxLength={4000} /><input type="hidden" name="run" value={cur.run_id} /><SubmitButton className="btn ghost" formAction={proposeLearning} pendingText="Sending…">Propose to the Knowledge bank</SubmitButton></form>
          )}

          <h3 className="mono small">Think it through</h3>
          <ul className="plainlist">{rec.frameworks.map((f) => (
            <li key={f.id} style={{ padding: '0.5rem 0' }}><b>{f.name}</b> <span className="muted small">({f.origin})</span><br />{f.lesson}<ul>{f.ask.map((q) => <li key={q}>{q}</li>)}</ul></li>
          ))}</ul>
        </article>
      )}

      <section className="card"><h2 className="mono">Recent runs</h2>
        {runs.length ? <table className="small"><thead><tr><th>When</th><th>Use case</th><th>Kind</th><th>Status</th></tr></thead><tbody>{runs.map((r) => (
          <tr key={r.run_id}><td><Link href={`/app/sandbox/hub/runs?run=${r.run_id}`}>{new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', dateStyle: 'short', timeStyle: 'short' })}</Link></td><td>{title(r.use_case_id)}</td><td>{r.mode}</td><td>{STATUS[r.status]}</td></tr>))}</tbody></table> : <p className="muted">No runs yet.</p>}
      </section>
    </div>
  )
}
