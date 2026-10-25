import { requireWorkspace } from '@/lib/session'
import { IntakeForm } from '@/components/intake-form'

export const metadata = { title: 'Intake' }

export default async function Intake() {
  const ctx = await requireWorkspace()
  const canAdd = ['owner', 'admin', 'reviewer', 'member'].includes(ctx.ws.role)
  const [{ data: projects }, { count: flagged }] = await Promise.all([
    ctx.sb.from('lois_projects').select('project_id, name').eq('tenant_id', ctx.ws.tenant_id).eq('archived', false),
    ctx.sb.from('lois_knowledge_items').select('knowledge_id', { count: 'exact', head: true }).eq('tenant_id', ctx.ws.tenant_id).eq('status', 'pending_review').eq('metadata->>via', 'intake').eq('metadata->>flagged', 'true'),
  ])
  return (
    <div className="stack">
      <div>
        <h1>Intake</h1>
        <p className="muted">Drop in files and LOIS does the tidying: it gives each a safe, dated name, skips anything you already added, reads the text (including scans and photos), indexes it for search, and drafts a title and summary. The draft waits in the knowledge bank. A person decides what becomes trusted.</p>
        {!!flagged && <p className="banner">{flagged} intake draft{flagged === 1 ? '' : 's'} flagged for a careful look in the <a href="/app/bank">knowledge bank</a>.</p>}
      </div>
      <div className="card"><IntakeForm projects={projects ?? []} canAdd={canAdd} /></div>
    </div>
  )
}
