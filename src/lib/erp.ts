import { redirect } from 'next/navigation'
import { requireWorkspace } from '@/lib/session'

/** Money is held in minor units (cents). */
export const money = (n: number | string | null | undefined, cur = 'KES') => `${cur} ${(Number(n ?? 0) / 100).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
export function toMinor(s: unknown): number | null {
  const x = parseFloat(String(s ?? '').replace(/,/g, '').trim())
  return Number.isFinite(x) && x >= 0 && x < 1e12 ? Math.round(x * 100) : null
}
export const errText = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong')

/** Opens a work page only when the business has that area switched on; otherwise sends the person to the picker. */
export async function workArea(area: string, label: string, b?: string) {
  const ctx = await requireWorkspace()
  const { data: bizList } = await ctx.sb.from('lois_businesses').select('business_id,name,currency').eq('tenant_id', ctx.ws.tenant_id).order('created_at')
  const biz = (bizList ?? []).find((x) => x.business_id === b) ?? (bizList ?? [])[0]
  if (!biz) redirect('/app/areas')
  const { data: on } = await ctx.sb.from('lois_business_areas').select('area_code').eq('business_id', biz.business_id).eq('area_code', area).eq('state', 'on').eq('active', true).maybeSingle()
  if (!on) redirect(`/app/areas?b=${biz.business_id}&error=${encodeURIComponent(`Switch on ${label} for ${biz.name} first.`)}`)
  const { data: sh } = await ctx.sb.from('lois_business_shares').select('from_business,dataset').eq('to_business', biz.business_id)
  const shared = (ds: string) => (sh ?? []).filter((s) => s.dataset === ds).map((s) => s.from_business as string)
  /** PostgREST filter: this business's rows, workspace-wide rows, and rows another business shares with it. */
  const scope = (ds: string) => `business_id.is.null,business_id.eq.${biz.business_id}${shared(ds).map((i) => `,business_id.eq.${i}`).join('')}`
  return { ctx, biz, bizList: bizList ?? [], scope }
}
