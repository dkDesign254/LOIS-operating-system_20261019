'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'

const clean = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong')
const back = (b: string, q: string) => redirect(`/app/areas?b=${encodeURIComponent(b)}&${q}`)

export async function addBusiness(fd: FormData) {
  const ctx = await requireWorkspace()
  const { data, error } = await ctx.sb.rpc('lois_business_save', { p_tenant: ctx.ws.tenant_id, p_name: String(fd.get('name') ?? '').slice(0, 80), p_sector: String(fd.get('sector') ?? '').slice(0, 80), p_currency: String(fd.get('currency') ?? '').slice(0, 3) })
  if (error) redirect('/app/areas?error=' + encodeURIComponent(clean(error)))
  revalidatePath('/app/areas'); back(String(data), 'done=business')
}
export async function setArea(on: string, fd: FormData) {
  const ctx = await requireWorkspace()
  const b = String(fd.get('business') ?? ''); const area = String(fd.get('area') ?? '')
  const { error } = await ctx.sb.rpc('lois_area_set', { p_business: b, p_area: area, p_on: on === '1', p_with_needs: fd.get('with_needs') === '1' })
  if (error) back(b, 'error=' + encodeURIComponent(clean(error)))
  revalidatePath('/app/areas'); back(b, 'done=' + (on === '1' ? 'on' : 'off'))
}
export async function setShare(on: string, fd: FormData) {
  const ctx = await requireWorkspace()
  const from = String(fd.get('from') ?? ''); const to = String(fd.get('to') ?? '')
  const { error } = await ctx.sb.rpc('lois_share_set', { p_from: from, p_to: to, p_dataset: String(fd.get('dataset') ?? ''), p_on: on === '1' })
  if (error) back(from, 'error=' + encodeURIComponent(clean(error)))
  revalidatePath('/app/areas'); back(from, 'done=share')
}
export async function setMember(on: string, fd: FormData) {
  const ctx = await requireWorkspace()
  const b = String(fd.get('business') ?? '')
  const { error } = await ctx.sb.rpc('lois_business_member_set', { p_business: b, p_user: String(fd.get('user') ?? ''), p_on: on === '1' })
  if (error) back(b, 'error=' + encodeURIComponent(clean(error)))
  revalidatePath('/app/areas'); back(b, 'done=member')
}
