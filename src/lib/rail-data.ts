import { cache } from 'react'
import type { Ctx } from '@/lib/session'
import { parseLayout, type RailLayout, type Usage, type Feedback, type Dismissed } from '@/lib/rail'

export type RailPrefs = { layout: RailLayout; usage: Usage; dismissed: Dismissed; feedback: Feedback }

const obj = <T,>(v: unknown): T => (v && typeof v === 'object' && !Array.isArray(v) ? (v as T) : ({} as T))

export const loadRail = cache(async (ctx: Ctx): Promise<RailPrefs> => {
  const { data } = await ctx.sb.from('lois_rail_prefs').select('layout,usage,dismissed,feedback').eq('user_id', ctx.user.id).maybeSingle()
  return { layout: parseLayout(data?.layout), usage: obj<Usage>(data?.usage), dismissed: obj<Dismissed>(data?.dismissed), feedback: obj<Feedback>(data?.feedback) }
})
