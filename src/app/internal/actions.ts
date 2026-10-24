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
