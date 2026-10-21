import { requireWorkspace } from '@/lib/session'
import { Icon } from '@/components/icons'
import { resolveHelp } from '../actions'

export const metadata = { title: 'Get help' }

export default async function Help({ searchParams }: { searchParams: Promise<{ sent?: string; resolved?: string; error?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  const { data: reqs } = await ctx.sb
    .from('lois_help_requests')
    .select('help_id, question, status, resolution, created_at, resolved_item_id')
    .eq('tenant_id', ctx.ws.tenant_id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="stack">
      <div>
        <h1>Get help</h1>
        <p className="muted">
          When the assistant can&apos;t answer, or you want a person to check, the question lands here. {ctx.isReviewer ? 'Answer it, and optionally send your answer to the knowledge bank so everyone benefits after review.' : 'A reviewer will reply. You can see the status below.'}
        </p>
      </div>
      {sp.sent && <div className="banner">Sent. A person will take a look.</div>}
      {sp.resolved && <div className="banner">Resolved.</div>}
      {sp.error && <div className="banner">Write an answer before resolving.</div>}

      {reqs?.length ? (
        reqs.map((r) => (
          <div className="card" key={r.help_id}>
            <div className="row">
              <b className="grow">{r.question}</b>
              <span className={`chip ${r.status === 'resolved' ? 'approved' : 'pending_review'}`}>{r.status.replace('_', ' ')}</span>
            </div>
            <p className="muted small">{new Date(r.created_at).toLocaleString('en-GB')}</p>
            {r.resolution && (
              <div className="card soft" style={{ whiteSpace: 'pre-wrap' }}>
                {r.resolution}
                {r.resolved_item_id && <p className="muted small">Sent to the knowledge bank for review.</p>}
              </div>
            )}
            {ctx.isReviewer && r.status !== 'resolved' && (
              <form action={resolveHelp} className="stack">
                <input type="hidden" name="id" value={r.help_id} />
                <input type="hidden" name="question" value={r.question} />
                <label htmlFor={`r-${r.help_id}`}>Your answer</label>
                <textarea id={`r-${r.help_id}`} name="resolution" required maxLength={8000} />
                <label className="row" style={{ fontWeight: 400 }}>
                  <input type="checkbox" name="promote" defaultChecked /> Send this answer to the knowledge bank for review
                </label>
                <button className="btn">Resolve</button>
              </form>
            )}
          </div>
        ))
      ) : (
        <div className="card empty">
          <Icon name="lifebuoy" />
          <p>No help requests yet.</p>
        </div>
      )}
    </div>
  )
}
