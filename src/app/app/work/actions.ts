'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'
import { toMinor, errText } from '@/lib/erp'

const s = (fd: FormData, k: string, n = 200) => String(fd.get(k) ?? '').trim().slice(0, n)
const go = (area: string, b: string, q: string): never => redirect(`/app/work/${area}?b=${encodeURIComponent(b)}&${q}`)
const fail = (area: string, b: string, e: unknown): never => go(area, b, 'error=' + encodeURIComponent(errText(e)))

export async function addContact(fd: FormData) {
  const ctx = await requireWorkspace(); const b = s(fd, 'b')
  const limit = toMinor(fd.get('credit_limit') || '0')
  if (limit === null) fail('crm', b, 'Credit limit must be a number.')
  const { error } = await ctx.sb.from('erp_contacts').insert({ tenant_id: ctx.ws.tenant_id, business_id: b, kind: s(fd, 'kind', 20) || 'customer', name: s(fd, 'name', 160), email: s(fd, 'email') || null, phone: s(fd, 'phone', 40) || null, kra_pin: s(fd, 'kra_pin', 20) || null, credit_limit: limit, payment_terms_days: Math.min(365, Math.max(0, parseInt(s(fd, 'terms', 4) || '14', 10) || 14)), created_by: ctx.user.id })
  if (error) fail('crm', b, error)
  revalidatePath('/app/work/crm'); go('crm', b, 'done=contact')
}
export async function addDeal(fd: FormData) {
  const ctx = await requireWorkspace(); const b = s(fd, 'b'); const v = toMinor(fd.get('value') || '0')
  if (v === null) fail('crm', b, 'Value must be a number.')
  const { error } = await ctx.sb.from('erp_deals').insert({ tenant_id: ctx.ws.tenant_id, business_id: b, title: s(fd, 'title', 160), contact_id: s(fd, 'contact') || null, value: v, owner_id: ctx.user.id })
  if (error) fail('crm', b, error)
  revalidatePath('/app/work/crm'); go('crm', b, 'done=deal')
}
export async function moveDeal(fd: FormData) {
  const ctx = await requireWorkspace(); const b = s(fd, 'b')
  const { error } = await ctx.sb.from('erp_deals').update({ stage: s(fd, 'stage', 20), updated_at: new Date().toISOString() }).eq('deal_id', s(fd, 'id')).eq('tenant_id', ctx.ws.tenant_id)
  if (error) fail('crm', b, error)
  revalidatePath('/app/work/crm'); go('crm', b, 'done=deal')
}
export async function addProduct(fd: FormData) {
  const ctx = await requireWorkspace(); const b = s(fd, 'b'); const price = toMinor(fd.get('price')); const cost = toMinor(fd.get('cost') || '0')
  if (price === null || cost === null) fail('inventory', b, 'Price and cost must be numbers.')
  const { error } = await ctx.sb.from('erp_products').insert({ tenant_id: ctx.ws.tenant_id, business_id: b, sku: s(fd, 'sku', 60), name: s(fd, 'name', 160), unit: s(fd, 'unit', 20) || 'unit', price, cost, tax_rate_bp: Math.round(Math.min(100, Math.max(0, parseFloat(s(fd, 'tax', 6) || '16') || 0)) * 100), tracks_stock: fd.get('tracks') === '1' })
  if (error) fail('inventory', b, error)
  revalidatePath('/app/work/inventory'); go('inventory', b, 'done=product')
}
export async function adjustStock(fd: FormData) {
  const ctx = await requireWorkspace(); const b = s(fd, 'b'); const q = parseFloat(s(fd, 'qty', 14))
  if (!Number.isFinite(q) || q === 0) fail('inventory', b, 'Enter a quantity (negative to remove).')
  const { error } = await ctx.sb.rpc('erp_stock_adjust', { p_product: s(fd, 'product'), p_qty: q, p_reason: s(fd, 'reason', 20), p_note: s(fd, 'note') || null })
  if (error) fail('inventory', b, error)
  revalidatePath('/app/work/inventory'); go('inventory', b, 'done=stock')
}
async function makeDoc(fd: FormData) {
  const ctx = await requireWorkspace(); const b = s(fd, 'b')
  const kind = s(fd, 'kind', 10) === 'quote' ? 'quote' : 'invoice'
  const { data: biz } = await ctx.sb.from('lois_businesses').select('currency').eq('business_id', b).maybeSingle()
  const lines: { description: string; qty: number; unit_price: number; product_id: string | null; tax_rate_bp: number }[] = []
  const { data: prods } = await ctx.sb.from('erp_products').select('product_id,name,price,tax_rate_bp').eq('tenant_id', ctx.ws.tenant_id)
  for (let i = 1; i <= 4; i++) {
    const pid = s(fd, 'p' + i); const qty = parseFloat(s(fd, 'q' + i, 14)); if (!pid && !s(fd, 'd' + i)) continue
    if (!Number.isFinite(qty) || qty <= 0) fail('invoicing', b, `Line ${i}: quantity must be above zero.`)
    const pr = prods?.find((x) => x.product_id === pid); const typed = toMinor(fd.get('u' + i))
    const unit = typed ?? pr?.price; if (unit === undefined || unit === null) fail('invoicing', b, `Line ${i}: add a price.`)
    lines.push({ description: s(fd, 'd' + i) || pr?.name || 'Item', qty, unit_price: unit as number, product_id: pid || null, tax_rate_bp: pr?.tax_rate_bp ?? 1600 })
  }
  if (!lines.length) fail('invoicing', b, 'Add at least one line.')
  const { data: d, error } = await ctx.sb.from('erp_docs').insert({ tenant_id: ctx.ws.tenant_id, business_id: b, kind, contact_id: s(fd, 'contact'), currency: biz?.currency ?? 'KES', notes: s(fd, 'notes', 500) || null, created_by: ctx.user.id }).select('doc_id').single()
  if (error || !d) fail('invoicing', b, error ?? 'Could not save')
  const { error: le } = await ctx.sb.from('erp_doc_lines').insert(lines.map((l) => ({ ...l, doc_id: d!.doc_id, tenant_id: ctx.ws.tenant_id })))
  if (le) fail('invoicing', b, le)
  return { ctx, b, id: d!.doc_id as string }
}
export async function saveDraft(fd: FormData) { const r = await makeDoc(fd); revalidatePath('/app/work/invoicing'); go('invoicing', r.b, 'done=draft') }
export async function saveAndIssue(fd: FormData) {
  const r = await makeDoc(fd)
  const { data, error } = await r.ctx.sb.rpc('erp_issue_doc', { p_doc: r.id })
  if (error) fail('invoicing', r.b, error)
  revalidatePath('/app/work/invoicing'); go('invoicing', r.b, 'done=' + (data === 'awaiting_approval' ? 'waiting' : 'issued'))
}
export async function issueDoc(fd: FormData) {
  const ctx = await requireWorkspace(); const b = s(fd, 'b')
  const { data, error } = await ctx.sb.rpc('erp_issue_doc', { p_doc: s(fd, 'id') })
  if (error) fail('invoicing', b, error)
  revalidatePath('/app/work/invoicing'); go('invoicing', b, 'done=' + (data === 'awaiting_approval' ? 'waiting' : 'issued'))
}
export async function payDoc(fd: FormData) {
  const ctx = await requireWorkspace(); const b = s(fd, 'b'); const amt = toMinor(fd.get('amount'))
  if (!amt) fail('invoicing', b, 'Enter the amount received.')
  const { data, error } = await ctx.sb.rpc('erp_record_payment', { p_doc: s(fd, 'id'), p_amount: amt, p_method: s(fd, 'method', 10) || 'bank', p_reference: s(fd, 'ref') || null })
  if (error) fail('invoicing', b, error)
  revalidatePath('/app/work/invoicing'); go('invoicing', b, 'done=paid&receipt=' + encodeURIComponent(String(data)))
}
