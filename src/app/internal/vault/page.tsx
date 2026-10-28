import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getCtx } from '@/lib/session'
import { MfaGate } from '../mfa'
import { saveVaultItem, deleteVaultItem } from '../actions'
import { ActionForm } from '@/components/forms'

export const metadata = { title: 'Vault', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

// The closed knowledge bank for methods and frameworks. Only allow-listed staff signed in with a second factor can read or write it.
// The database enforces that too (row-level security on is_staff_mfa), so a bug here cannot expose it. It is never indexed or searched by Ask LOIS.
export default async function Vault() {
  const ctx = await getCtx()
  if (!ctx.isStaff) notFound()
  const { data: aal } = await ctx.sb.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aal?.currentLevel !== 'aal2') return <div className="authwrap"><MfaGate hasFactor={aal?.nextLevel === 'aal2'} /></div>
  const { data: items } = await ctx.sb.from('lois_vault_items').select('item_id,title,body,tags,created_at').order('created_at', { ascending: false }).limit(100)
  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '1.5rem 1.25rem 4rem' }} className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}><h1 style={{ margin: 0 }}>Vault</h1><Link className="btn ghost" href="/internal">Staff console</Link></div>
      <p className="muted">Methods, frameworks and structures that stay inside the company. Nobody outside the allow-list can open this, and it is not part of what Ask LOIS searches.</p>
      <div className="card">
        <ActionForm action={saveVaultItem as never} submit="Store">
          <label htmlFor="vt">Title</label><input id="vt" name="title" required minLength={3} maxLength={160} />
          <label htmlFor="vb">Content</label><textarea id="vb" name="body" rows={8} required maxLength={20000} />
          <label htmlFor="vg">Tags (comma separated)</label><input id="vg" name="tags" />
        </ActionForm>
      </div>
      <div className="card">
        <h2>Stored ({items?.length ?? 0})</h2>
        {items?.length ? <ul className="plainlist">{items.map((i) => (
          <li key={i.item_id} style={{ padding: '0.6rem 0' }}>
            <details><summary><b>{i.title}</b> <span className="muted small">{(i.tags as string[]).join(', ')}</span></summary><pre className="draft">{i.body}</pre></details>
            <form action={deleteVaultItem}><input type="hidden" name="id" value={i.item_id} /><button className="btn ghost small">Delete</button></form>
          </li>))}</ul> : <p className="muted">Empty.</p>}
      </div>
    </div>
  )
}
