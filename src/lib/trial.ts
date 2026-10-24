import type { SupabaseClient } from '@supabase/supabase-js'

export const TRIAL_DAYS = 25
export type Trial = { days_left: number; ends_at: string; ended: boolean } | null

/** Starts the clock on first use. Internal (staff) workspaces have no clock. */
export async function getTrial(sb: SupabaseClient, internal: boolean): Promise<Trial> {
  if (internal) return null
  const { data } = await sb.rpc('lois_my_trial')
  const r = Array.isArray(data) ? data[0] : data
  return r ? { days_left: r.days_left, ends_at: r.ends_at, ended: r.ended } : null
}
