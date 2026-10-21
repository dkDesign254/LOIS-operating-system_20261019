import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { supabaseServer } from '@/lib/supabase/server'

export type Workspace = {
  tenant_id: string
  name: string
  slug: string
  plan: string
  tenant_type: string
  role: string
}

export type Ctx = {
  sb: SupabaseClient
  user: User
  workspaces: Workspace[]
  ws: Workspace | null
  isReviewer: boolean
  isAdmin: boolean
}

export const TENANT_COOKIE = 'lois_tenant'

async function loadWorkspaces(sb: SupabaseClient, uid: string): Promise<Workspace[]> {
  const { data: ms } = await sb.from('lois_memberships').select('tenant_id, role').eq('user_id', uid)
  if (!ms?.length) return []
  const { data: ts } = await sb
    .from('lois_tenants')
    .select('tenant_id, name, slug, plan, tenant_type')
    .in('tenant_id', ms.map((m) => m.tenant_id))
  return (ts ?? []).map((t) => ({ ...t, role: ms.find((m) => m.tenant_id === t.tenant_id)!.role }))
}

/** Signed-in user plus their workspaces. Redirects to /login when signed out. */
export const getCtx = cache(async (): Promise<Ctx> => {
  const sb = await supabaseServer()
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) redirect('/login')

  let workspaces = await loadWorkspaces(sb, user.id)
  if (!workspaces.length) {
    // Accepts pending invitations / allow-listed admin access for this verified email.
    await sb.rpc('lois_bootstrap_session')
    workspaces = await loadWorkspaces(sb, user.id)
  }
  const wanted = (await cookies()).get(TENANT_COOKIE)?.value
  const ws = workspaces.find((w) => w.tenant_id === wanted) ?? workspaces[0] ?? null
  const role = ws?.role ?? ''
  return {
    sb,
    user,
    workspaces,
    ws,
    isReviewer: ['owner', 'admin', 'reviewer'].includes(role),
    isAdmin: ['owner', 'admin'].includes(role),
  }
})

/** Like getCtx but guarantees a workspace; sends new users to create one. */
export async function requireWorkspace(): Promise<Ctx & { ws: Workspace }> {
  const ctx = await getCtx()
  if (!ctx.ws) redirect('/app/welcome')
  return ctx as Ctx & { ws: Workspace }
}
