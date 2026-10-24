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
