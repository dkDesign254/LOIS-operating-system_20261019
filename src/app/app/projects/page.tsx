import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { Icon } from '@/components/icons'
import { createProject } from '../actions'

export const metadata = { title: 'Projects' }

export default async function Projects() {
  const ctx = await requireWorkspace()
  const { data: projects } = await ctx.sb
    .from('lois_projects')
    .select('project_id, name, description, created_at')
    .eq('tenant_id', ctx.ws.tenant_id)
    .eq('archived', false)
    .order('created_at', { ascending: false })

  return (
    <div className="stack">
      <div>
        <h1>Projects</h1>
        <p className="muted">Group related documents and chats, for example one project per client engagement.</p>
      </div>
      <div className="grid two">
        {(projects ?? []).map((p) => (
          <div className="card" key={p.project_id}>
            <Icon name="folder" style={{ width: 24, height: 24, color: 'var(--blue)' }} />
            <h3 style={{ marginTop: '0.4rem' }}>{p.name}</h3>
            <p className="muted">{p.description ?? 'No description.'}</p>
            <Link className="btn ghost small" href="/app/knowledge">
              Add documents
            </Link>
          </div>
        ))}
        {!projects?.length && (
          <div className="card empty">
            <Icon name="folder" />
            <p>No projects yet.</p>
          </div>
        )}
      </div>
      <div className="card soft">
        <h2>New project</h2>
        <ActionForm action={createProject} submit="Create project">
          <div className="field">
            <label htmlFor="n">Name</label>
            <input id="n" name="name" type="text" required maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="d">Description</label>
            <textarea id="d" name="description" maxLength={1000} style={{ minHeight: 70 }} />
          </div>
        </ActionForm>
      </div>
    </div>
  )
}
