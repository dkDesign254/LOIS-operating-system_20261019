import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireWorkspace } from '@/lib/session'
import { sourceLinks } from '@/lib/sources'
import { SubmitButton } from '@/components/submit-button'
import { decideAndNext } from '../actions'

export const metadata = { title: 'Review queue' }

export default async function Review({ searchParams }: { searchParams: Promise<{ id?: string; error?: string; saved?: string; done?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  if (!ctx.isReviewer) redirect('/app/bank')

  const { data: queue } = await ctx.sb.from('lois_knowledge_items').select('knowledge_id,title').eq('tenant_id', ctx.ws.tenant_id).eq('status', 'pending_review').order('created_at', { ascending: true }).order('knowledge_id').limit(1000)
  const ids = (queue ?? []).map((q) => q.knowledge_id as string)
  const banner = sp.saved ? <p className="ok" role="status">{sp.saved === 'approved' ? 'Accepted. It is now searchable.' : 'Rejected, with your reason recorded.'}</p> : null

  if (!ids.length) {
    return (
      <div className="stack">
        <h1>Review queue</h1>
        {banner}
        <div className="card"><p><b>Nothing is waiting.</b> Every entry has a decision.</p><Link className="btn" href="/app/bank?s=approved">See accepted entries</Link></div>
      </div>
    )
  }
  const id = sp.id && ids.includes(sp.id) ? sp.id : ids[0]
  const pos = ids.indexOf(id)
  const { data: e } = await ctx.sb.from('lois_knowledge_items').select('knowledge_id,title,content,domain,evidence_label,version,created_by,created_at,metadata,supersedes_id').eq('knowledge_id', id).single()
  if (!e) redirect(R0)
  const links = sourceLinks(e.metadata?.source_repo_path)
  const web = ((e.metadata?.web_sources ?? []) as { title: string; url: string }[]).filter((w) => typeof w.url === 'string' && w.url.startsWith('https://'))
  const { data: related } = await ctx.sb
    .from('lois_knowledge_items')
    .select('knowledge_id,title,status')
    .eq('tenant_id', ctx.ws.tenant_id)
    .neq('knowledge_id', id)
    .or(`domain.eq.${String(e.domain).replace(/[^\w -]/g, '')}${e.metadata?.source_repo_path ? `,metadata->>source_repo_path.eq.${String(e.metadata.source_repo_path).replace(/[(),"]/g, ' ')}` : ''}`)
    .order('created_at', { ascending: false })
    .limit(6)
  const prev = ids[pos - 1], next = ids[pos + 1]
  const note = e.metadata?.note as string | undefined

  return (
    <div className="stack">
      <div>
        <h1>Review queue</h1>
        <p className="muted">Read the entry and its sources, then accept, reject or skip. The next one opens by itself.</p>
        <div className="meter" role="progressbar" aria-label="Queue position" aria-valuemin={1} aria-valuemax={ids.length} aria-valuenow={pos + 1}><i style={{ width: `${((pos + 1) / ids.length) * 100}%` }} /></div>
        <p className="small mono">Entry {pos + 1} of {ids.length} waiting</p>
      </div>
      {banner}
      {sp.error && <p className="err" role="alert">{sp.error}</p>}

      <article className="card" aria-labelledby="e-t">
        <div className="row">
          <h2 id="e-t" className="grow" style={{ margin: 0 }}>{e.title}</h2>
          <span className={`chip ${e.evidence_label}`}>{e.evidence_label}</span>
          <span className="chip">{e.domain}</span>
        </div>
        <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.8rem' }}>{e.content}</p>
        <p className="muted small">Added {new Date(e.created_at).toLocaleDateString('en-GB')}{e.metadata?.via ? ` · via ${e.metadata.via}` : ''}{e.supersedes_id ? ' · proposes a new version of an earlier entry' : ''}</p>
        {note && <p className="callout small">{note}</p>}
        {e.supersedes_id && <p className="small"><Link href={`/app/bank/history/${e.knowledge_id}`}>Compare with the version this replaces</Link></p>}
      </article>

      <section className="card" aria-labelledby="src-h">
        <h3 id="src-h" className="mono">Reference material</h3>
        {links.length ? (
          <ul className="plainlist">
            {links.map((l) => (
              <li key={l.label}>
                {l.url ? <a href={l.url} target="_blank" rel="noopener noreferrer">{l.label} <span className="sr-only">(opens in a new tab)</span></a> : <span>{l.label}</span>}
                {l.note && <span className="muted small"> {l.note}</span>}
              </li>
            ))}
          </ul>
        ) : web.length ? null : <p className="muted small">{e.metadata?.via === 'seed' ? 'This is a starting entry written for the workspace; it has no outside source. Judge it against what you know about the company.' : 'No source is recorded for this entry. Consider asking the author before accepting.'}</p>}
        {web.length > 0 && <ul className="plainlist">{web.map((w) => <li key={w.url}><a href={w.url} target="_blank" rel="noopener noreferrer">{w.title}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul>}
        {links.some((l) => l.url) && <p className="muted small">Most source repositories are private. If GitHub says &quot;not found&quot;, sign in to GitHub as dkDesign254 first.</p>}
        {related && related.length > 0 && (
          <>
            <h4 className="mono">Related entries</h4>
            <ul className="plainlist">
              {related.map((r) => (
                <li key={r.knowledge_id}>
                  {r.status === 'pending_review' ? <Link href={`/app/bank/review?id=${r.knowledge_id}`}>{r.title}</Link> : <span>{r.title}</span>} <span className="chip">{String(r.status).replace('_', ' ')}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <form className="card" aria-labelledby="d-h">
        <h3 id="d-h" className="mono">Your decision</h3>
        <input type="hidden" name="id" value={id} />
        <label htmlFor="note">Note (needed to reject; helpful when accepting)</label>
        <textarea id="note" name="note" maxLength={1000} rows={3} />
        <div className="row" style={{ marginTop: '0.8rem', gap: '0.5rem', flexWrap: 'wrap' }}>
          <SubmitButton className="btn" formAction={decideAndNext.bind(null, 'approved')} pendingText="Saving…">Accept</SubmitButton>
          <SubmitButton className="btn ghost" formAction={decideAndNext.bind(null, 'rejected')} pendingText="Saving…">Reject</SubmitButton>
          <SubmitButton className="btn ghost" formAction={decideAndNext.bind(null, 'skip')} pendingText="Opening…">Skip for now</SubmitButton>
        </div>
        <p className="muted small">Accepting makes it searchable and awards points to the author. Rejecting keeps it on record and read-only.</p>
      </form>

      <nav className="row" aria-label="Queue" style={{ justifyContent: 'space-between' }}>
        {prev ? <Link href={`/app/bank/review?id=${prev}`}>← Previous</Link> : <span />}
        <Link href="/app/bank">Back to the list</Link>
        {next ? <Link href={`/app/bank/review?id=${next}`}>Next →</Link> : <span />}
      </nav>
    </div>
  )
}
const R0 = '/app/bank/review'
