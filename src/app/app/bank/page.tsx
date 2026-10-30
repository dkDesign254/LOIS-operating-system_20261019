import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { Icon } from '@/components/icons'
import { expireKnowledge, submitKnowledge } from '../actions'
import { ReviewButtons } from '@/components/review-buttons'
import { SubmitButton } from '@/components/submit-button'
import { IndexPanel } from '@/components/index-panel'

export const metadata = { title: 'Knowledge bank' }

const TABS = [
  { id: 'pending_review', label: 'Awaiting review' },
  { id: 'approved', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'superseded', label: 'Superseded' },
]

export default async function Bank({ searchParams }: { searchParams: Promise<{ s?: string; error?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  const status = TABS.some((t) => t.id === sp.s) ? sp.s! : ctx.isReviewer ? 'pending_review' : 'approved'
  const canSubmit = ['owner', 'admin', 'reviewer', 'member'].includes(ctx.ws.role)

  const { data: items } = await ctx.sb
    .from('lois_knowledge_items')
    .select('knowledge_id, title, content, domain, evidence_label, status, version, created_by, created_at, metadata, supersedes_id')
    .eq('tenant_id', ctx.ws.tenant_id)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100)

  // Embeddings live in lois_embeddings, not on the entry, so the gaps function is the truthful source.
  const idx = ctx.isReviewer
    ? await Promise.all([
        ctx.sb.from('lois_knowledge_items').select('knowledge_id', { count: 'exact', head: true }).eq('tenant_id', ctx.ws.tenant_id).eq('status', 'approved'),
        ctx.sb.rpc('lois_embedding_gaps', { p_tenant: ctx.ws.tenant_id, p_limit: 50 }),
      ])
    : null
  const gapCount = idx ? ((idx[1].data ?? []) as { source_kind: string }[]).filter((g) => g.source_kind === 'bank').length : 0

  return (
    <div className="stack">
      <div>
        <h1>Knowledge bank</h1>
        <p className="muted">
          The trusted store. Entries are searchable and used to improve answers only after a reviewer accepts them. Accepted entries are never edited in place: a correction is a new version that supersedes the old one, so the history stays intact.
        </p>
      </div>

      {sp.error && <p className="err">{sp.error}</p>}
      {idx && (idx[0].count ?? 0) > 0 && <IndexPanel total={idx[0].count ?? 0} missing={gapCount} />}
      {ctx.isReviewer && status === 'pending_review' && items && items.length > 0 && (
        <div className="callout row" style={{ justifyContent: 'space-between' }}>
          <span><b>{items.length}</b> waiting. Read them one at a time with their sources.</span>
          <Link className="btn" href="/app/bank/review">Start reviewing</Link>
        </div>
      )}

      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <Link key={t.id} href={`/app/bank?s=${t.id}`} aria-current={status === t.id}>
            {t.label}
          </Link>
        ))}
      </div>

      <div className="stack">
        {items?.length ? (
          items.map((i) => (
            <div className="card" key={i.knowledge_id}>
              <div className="row">
                <h3 style={{ margin: 0 }} className="grow">
                  {i.title}
                </h3>
                <span className={`chip ${i.evidence_label}`}>{i.evidence_label}</span>
                <span className={`chip ${i.status}`}>{i.status.replace('_', ' ')}</span>
                <span className="chip">v{i.version}</span>
              </div>
              <p style={{ marginTop: '0.6rem', whiteSpace: 'pre-wrap' }}>{i.content}</p>
              {i.metadata?.review?.note && <p className="callout small">Reviewer note: {i.metadata.review.note} <span className="muted">({i.metadata.review.by ?? 'reviewer'}, {new Date(i.metadata.review.at).toLocaleDateString('en-GB')})</span></p>}
              <p className="muted small">
                {i.domain} · {new Date(i.created_at).toLocaleDateString('en-GB')}
                {i.metadata?.via ? ` · via ${i.metadata.via}` : ''}
              </p>
              {ctx.isReviewer && i.status === 'pending_review' && (
                <div className="row">
                  <ReviewButtons id={i.knowledge_id} />
                  <Link className="small" href={`/app/bank/review?id=${i.knowledge_id}`}>Read sources and decide</Link>
                  <span className="muted small">Accepting makes it searchable and awards points to the author.</span>
                </div>
              )}
              {(i.supersedes_id || i.status === 'superseded' || i.version > 1) && <Link className="small" href={`/app/bank/history/${i.knowledge_id}`}>Version history</Link>}
              {ctx.isReviewer && i.status === 'approved' && (
                <form action={expireKnowledge}>
                  <input type="hidden" name="id" value={i.knowledge_id} />
                  <SubmitButton className="btn ghost small">Mark as out of date</SubmitButton>
                </form>
              )}
            </div>
          ))
        ) : (
          <div className="card empty">
            <Icon name="shield" />
            <p>Nothing {status === 'pending_review' ? 'awaiting review' : status.replace('_', ' ')}.</p>
          </div>
        )}
      </div>

      {canSubmit && (
        <div className="card soft">
          <h2>Propose an entry</h2>
          <p className="muted small">Write it as a clear, self-contained statement. To correct an existing entry, paste its ID in &quot;Supersedes&quot; and the new version replaces it once accepted.</p>
          <ActionForm action={submitKnowledge} submit="Submit for review">
            <div className="field">
              <label htmlFor="t">Title</label>
              <input id="t" name="title" type="text" required maxLength={200} />
            </div>
            <div className="field">
              <label htmlFor="c">Content</label>
              <textarea id="c" name="content" required maxLength={20000} />
            </div>
            <div className="grid two" style={{ marginTop: '0.85rem' }}>
              <div>
                <label htmlFor="d">Domain</label>
                <input id="d" name="domain" type="text" defaultValue="general" maxLength={80} />
              </div>
              <div>
                <label htmlFor="l">Evidence label</label>
                <select id="l" name="label" defaultValue="reported">
                  <option value="verified">Verified</option>
                  <option value="reported">Reported</option>
                  <option value="example">Example</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="s">Supersedes (entry ID, optional)</label>
              <input id="s" name="supersedes" type="text" placeholder="Paste an entry ID to publish a new version" />
            </div>
          </ActionForm>
        </div>
      )}
    </div>
  )
}
