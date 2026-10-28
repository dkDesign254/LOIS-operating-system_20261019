'use server'
import { revalidatePath } from 'next/cache'
import { getCtx } from '@/lib/session'

export async function setRequestStatus(fd: FormData) {
  const ctx = await getCtx()
  if (!ctx.isStaff) return
  const status = String(fd.get('status') ?? '')
  if (!['open', 'in_progress', 'done', 'declined'].includes(status)) return
  // Row-level security additionally requires a second-factor session.
  await ctx.sb
    .from('lois_data_requests')
    .update({ status, resolved_at: status === 'done' || status === 'declined' ? new Date().toISOString() : null })
    .eq('request_id', String(fd.get('id') ?? ''))
  revalidatePath('/internal')
}

export type ExtendState = { error?: string; message?: string } | null
export async function extendTrial(_: ExtendState, fd: FormData): Promise<ExtendState> {
  const ctx = await getCtx()
  if (!ctx.isStaff) return { error: 'Not allowed.' }
  const days = Number(fd.get('days'))
  const { data, error } = await ctx.sb.rpc('lois_extend_trial', { p_email: String(fd.get('email') ?? ''), p_days: days, p_note: String(fd.get('note') ?? '').slice(0, 200) || null })
  if (error) return { error: error.message }
  return { message: `Trial now ends ${new Date(data as string).toLocaleDateString('en-GB')}.` }
}

export async function decideAccess(fd: FormData) {
  const ctx = await getCtx()
  if (!ctx.isStaff) return
  const decision = String(fd.get('decision') ?? '')
  if (!['approved', 'denied'].includes(decision)) return
  // The database function re-checks staff + second factor and only allows internal workspaces and three roles.
  await ctx.sb.rpc('lois_decide_access', {
    p_id: String(fd.get('id') ?? ''),
    p_decision: decision,
    p_tenant: String(fd.get('tenant') ?? '') || null,
    p_role: String(fd.get('role') ?? 'viewer'),
    p_note: String(fd.get('note') ?? '').slice(0, 500) || null,
  })
  revalidatePath('/internal')
}

export async function postUpdate(_: ExtendState, fd: FormData): Promise<ExtendState> {
  const ctx = await getCtx()
  if (!ctx.isStaff) return { error: 'Not allowed.' }
  const kind = String(fd.get('kind') ?? '')
  const link = String(fd.get('link') ?? '').trim()
  if (!['linkedin', 'framework', 'system', 'ai'].includes(kind)) return { error: 'Choose a kind.' }
  if (link && !/^https:\/\//.test(link)) return { error: 'A link must start with https://' }
  const { error } = await ctx.sb.from('lois_updates').insert({ kind, title: String(fd.get('title') ?? '').trim(), body: String(fd.get('body') ?? '').trim(), link: link || null })
  if (error) return { error: 'Could not post. Check the title (3 to 140 characters) and text (up to 600).' }
  revalidatePath('/app', 'layout')
  return { message: 'Posted to every workspace.' }
}

export async function removeUpdate(fd: FormData) {
  const ctx = await getCtx()
  if (!ctx.isStaff) return
  await ctx.sb.from('lois_updates').delete().eq('update_id', String(fd.get('id') ?? ''))
  revalidatePath('/app', 'layout')
}

export async function saveVaultItem(_: ExtendState, fd: FormData): Promise<ExtendState> {
  const ctx = await getCtx()
  if (!ctx.isStaff) return { error: 'Not allowed.' }
  const tags = String(fd.get('tags') ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 8)
  const { error } = await ctx.sb.from('lois_vault_items').insert({ title: String(fd.get('title') ?? '').trim(), body: String(fd.get('body') ?? ''), tags })
  if (error) return { error: 'Not saved. Needs a title and text, and a second-factor sign-in.' }
  revalidatePath('/internal/vault')
  return { message: 'Stored in the vault.' }
}

export async function deleteVaultItem(fd: FormData) {
  const ctx = await getCtx()
  if (!ctx.isStaff) return
  await ctx.sb.from('lois_vault_items').delete().eq('item_id', String(fd.get('id') ?? ''))
  revalidatePath('/internal/vault')
}
