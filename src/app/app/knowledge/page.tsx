import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { Icon } from '@/components/icons'
import { addDocument, archiveDocument } from '../actions'

export const metadata = { title: 'Knowledge base' }

export default async function Knowledge() {
  const ctx = await requireWorkspace()
  const canAdd = ['owner', 'admin', 'reviewer', 'member'].includes(ctx.ws.role)
  const [{ data: docs }, { data: projects }] = await Promise.all([
    ctx.sb
      .from('lois_documents')
      .select('document_id, title, source_name, source_type, evidence_label, status, created_at')
      .eq('tenant_id', ctx.ws.tenant_id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(100),
    ctx.sb.from('lois_projects').select('project_id, name').eq('tenant_id', ctx.ws.tenant_id).eq('archived', false),
  ])

  return (
    <div className="stack">
      <div>
        <h1>Knowledge base</h1>
        <p className="muted">
          Your working documents. They are indexed for search the moment you add them. Label how much you trust each one: <b>verified</b> (checked by a person), <b>reported</b> (from a source, not checked), or <b>example</b> (illustrative). To make something authoritative, put it through the <a href="/app/bank">knowledge bank</a>.
        </p>
      </div>

      {canAdd ? (
        <div className="card">
          <h2>Add a document</h2>
          <ActionForm action={addDocument} submit="Add and index">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" type="text" maxLength={200} required />
            </div>
            <div className="field">
              <label htmlFor="content">Paste text</label>
              <textarea id="content" name="content" maxLength={400000} placeholder="Paste the text here, or upload a file below." />
            </div>
            <div className="field">
              <label htmlFor="file">…or upload a file (.txt, .md, .csv, .json, up to 1 MB)</label>
              <input id="file" name="file" type="file" accept=".txt,.md,.csv,.json" />
            </div>
            <div className="grid two" style={{ marginTop: '0.85rem' }}>
              <div>
                <label htmlFor="label">Evidence label</label>
                <select id="label" name="label" defaultValue="reported">
                  <option value="verified">Verified</option>
                  <option value="reported">Reported</option>
                  <option value="example">Example</option>
                </select>
              </div>
              <div>
                <label htmlFor="project">Project (optional)</label>
                <select id="project" name="project" defaultValue="">
                  <option value="">None</option>
                  {(projects ?? []).map((p) => (
                    <option key={p.project_id} value={p.project_id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ActionForm>
        </div>
      ) : (
        <div className="banner">You have read-only access. Ask an admin for the member role to add documents.</div>
      )}

      <div className="card">
        <h2>Documents ({docs?.length ?? 0})</h2>
        {docs?.length ? (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Label</th>
                <th>Source</th>
                <th>Added</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.document_id}>
                  <td>{d.title}</td>
                  <td>
                    <span className={`chip ${d.evidence_label}`}>{d.evidence_label}</span>
                  </td>
                  <td className="muted">{d.source_name ?? d.source_type}</td>
                  <td className="muted">{new Date(d.created_at).toLocaleDateString('en-GB')}</td>
                  <td>
                    {ctx.isReviewer && (
                      <form action={archiveDocument}>
                        <input type="hidden" name="id" value={d.document_id} />
                        <button className="btn ghost small">Archive</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">
            <Icon name="book" />
            <p>Nothing here yet. Add your first document above.</p>
          </div>
        )}
      </div>
    </div>
  )
}
