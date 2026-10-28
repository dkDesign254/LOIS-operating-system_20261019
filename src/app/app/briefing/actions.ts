'use server'
import { revalidatePath } from 'next/cache'
import { getCtx } from '@/lib/session'
import { todayBriefing } from '@/lib/briefing-data'
import type { FormState } from '../actions'

export async function savePrefs(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getCtx()
  const time = String(fd.get('send_time') ?? '09:40')
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: 'Pick a time like 09:40.' }
  const weekend = String(fd.get('weekend') ?? 'off')
  if (!['off', 'ask', 'on'].includes(weekend)) return { error: 'Choose how weekends should work.' }
  const weekdays = [1, 2, 3, 4, 5].filter((d) => fd.get(`d${d}`) === 'on')
  const { error } = await ctx.sb.from('lois_brief_prefs').upsert({
    user_id: ctx.user.id, enabled: fd.get('enabled') === 'on', send_time: time, weekdays, weekend, voice: fd.get('voice') === 'on', updated_at: new Date().toISOString(),
  })
  if (error) return { error: 'Could not save. Try again shortly.' }
  revalidatePath('/app', 'layout')
  return { message: 'Saved. Times are Nairobi time.' }
}

// "Brief me now": one press, at most six refreshes a day.
export async function briefNow() {
  const ctx = await getCtx()
  await todayBriefing(ctx, true)
  revalidatePath('/app', 'layout')
}
