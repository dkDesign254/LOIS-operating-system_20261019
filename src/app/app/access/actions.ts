'use server'
import { revalidatePath } from 'next/cache'
import { getCtx } from '@/lib/session'
import type { FormState } from '../actions'

// Everyone starts in their own customer workspace. Internal access is only ever requested here and
// granted by an allow-listed staff member who has a second factor (database function `lois_decide_access`).
export async function requestInternalAccess(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getCtx()
  const reason = String(fd.get('reason') ?? '').trim()
  const role = String(fd.get('role') ?? 'viewer')
  if (reason.length < 10) return { error: 'Tell us in a sentence or two why you need it (at least 10 characters).' }
  if (reason.length > 1000) return { error: 'Please keep the reason under 1000 characters.' }
  if (!['viewer', 'member', 'reviewer'].includes(role)) return { error: 'Choose a level from the list.' }
  const { error } = await ctx.sb.from('lois_access_requests').insert({ reason, requested_role: role, email: ctx.user.email })
  if (error) return { error: error.code === '23505' ? 'You already have a request waiting. A staff member will reply.' : 'Could not send the request. Try again shortly.' }
  revalidatePath('/app/access')
  return { message: 'Request sent. Nothing changes for you until a staff member approves it.' }
}

export async function withdrawAccessRequest(fd: FormData) {
  const ctx = await getCtx()
  await ctx.sb.from('lois_access_requests').update({ status: 'withdrawn' }).eq('request_id', String(fd.get('id') ?? '')).eq('user_id', ctx.user.id)
  revalidatePath('/app/access')
}
