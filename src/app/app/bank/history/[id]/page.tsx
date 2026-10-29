import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireWorkspace } from '@/lib/session'

export const metadata = { title: 'Version history' }

type Row = { knowledge_id: string; title: string; content: string; status: string; version: number; supersedes_id: string | null; created_at: string; metadata: Record<string, any> | null }
const COLS = 'knowledge_id,title,content,status,version,supersedes_id,created_at,metadata'

/** Walks back through the versions an entry replaced, and forward to anything that replaced it. */
export default async function History({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireWorkspace()
  const t = ctx.ws.tenant_id
  const { data: start } = await ctx.sb.from('lois_knowledge_items').select(COLS).eq('knowledge_id', id).eq('tenant_id', t).maybeSingle()
  if (!start) notFound()

  const chain: Row[] = [start as Row]
  for (let i = 0; i < 12; i++) {
    const head = chain[0]
    const { data: newer } = await ctx.sb.from('lois_knowledge_items').select(COLS).eq('tenant_id', t).eq('supersedes_id', head.knowledge_id).limit(1).maybeSingle()
    if (!newer) break
    chain.unshift(newer as Row)
  }
  for (let i = 0; i < 12; i++) {
    const tail = chain[chain.length - 1]
    if (!tail.supersedes_id) break
    const { data: older } = await ctx.sb.from('lois_knowledge_items').select(COLS).eq('tenant_id', t).eq('knowledge_id', tail.supersedes_id).maybeSingle()
    if (!older) break
    chain.push(older as Row)
  }

  return (
    <div className="stack">
      <div>
        <h1>Version history</h1>
        <p className="muted">Newest first. Accepted entries are never edited: a correction is a new version, so every earlier wording stays on record.</p>
      </div>
      {chain.length === 1 && <p className="callout">This entry has only one version so far.</p>}
      {chain.map((v) => (
        <article key={v.knowledge_id} className="card" aria-current={v.knowledge_id === id}>
          <div className="row">
            <h2 className="grow" style={{ margin: 0 }}>v{v.version}: {v.title}</h2>
            <span className={`chip ${v.status}`}>{v.status.replace('_', ' ')}</span>
          </div>
          <p style={{ whiteSpace: 'pre-wrap' }}>{v.content}</p>
          <p className="muted small">{new Date(v.created_at).toLocaleDateString('en-GB')}{v.metadata?.review?.note ? ` · reviewer note: ${v.metadata.review.note}` : ''}</p>
        </article>
      ))}
      <p><Link href="/app/bank">Back to the Knowledge bank</Link></p>
    </div>
  )
}
