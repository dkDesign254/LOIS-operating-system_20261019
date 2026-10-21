import { redirect } from 'next/navigation'
import { getCtx } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { createWorkspace } from '../actions'

export const metadata = { title: 'Welcome' }

export default async function Welcome() {
  const ctx = await getCtx()
  if (ctx.ws) redirect('/app')
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1>Welcome to LOIS</h1>
      <p className="muted">
        You don&apos;t belong to a workspace yet. Create your own, or ask a workspace admin to invite <b>{ctx.user.email}</b>. Once invited, refresh this page and you&apos;ll be in.
      </p>
      <div className="card">
        <h2>Create a workspace</h2>
        <ActionForm action={createWorkspace} submit="Create workspace">
          <label htmlFor="name">Workspace name</label>
          <input id="name" name="name" type="text" required minLength={2} maxLength={80} placeholder="Acme Ltd" />
          <p className="muted small" style={{ marginTop: '0.5rem' }}>
            Free plan: 50 questions a day, up to three workspaces. You become the owner and decide who can add and review knowledge.
          </p>
        </ActionForm>
      </div>
    </div>
  )
}
