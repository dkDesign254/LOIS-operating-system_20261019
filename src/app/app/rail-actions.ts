'use server'
import { revalidatePath } from 'next/cache'
import { getCtx } from '@/lib/session'
import { parseLayout } from '@/lib/rail'

const today = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10)

export async function saveRailLayout(layout: unknown) {
  const ctx = await getCtx()
  const clean = parseLayout(layout)
  await ctx.sb.from('lois_rail_prefs').upsert({ user_id: ctx.user.id, layout: clean, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  revalidatePath('/app', 'layout')
}

export async function touchSection(section: string) {
  const ctx = await getCtx()
  await ctx.sb.rpc('lois_rail_touch', { p_section: String(section).slice(0, 30) })
}

/** "Not useful" hides that suggestion for a while and lowers its kind; following it raises the kind. */
export async function railVote(id: string, kind: string, vote: 'up' | 'down') {
  const ctx = await getCtx()
  const k = String(kind).replace(/[^a-z-]/g, '').slice(0, 20)
  const sid = String(id).replace(/[^a-z0-9-]/g, '').slice(0, 40)
  if (!k || !sid) return
  const { data } = await ctx.sb.from('lois_rail_prefs').select('feedback,dismissed').eq('user_id', ctx.user.id).maybeSingle()
  const fb = (data?.feedback ?? {}) as Record<string, { up?: number; down?: number }>
  const dismissed = (data?.dismissed ?? {}) as Record<string, string>
  fb[k] = { up: (fb[k]?.up ?? 0) + (vote === 'up' ? 1 : 0), down: (fb[k]?.down ?? 0) + (vote === 'down' ? 1 : 0) }
  if (vote === 'down') dismissed[sid] = today()
  const keys = Object.keys(dismissed)
  if (keys.length > 60) for (const x of keys.slice(0, keys.length - 60)) delete dismissed[x]
  await ctx.sb.from('lois_rail_prefs').upsert({ user_id: ctx.user.id, feedback: fb, dismissed, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (vote === 'down') revalidatePath('/app', 'layout')
}
