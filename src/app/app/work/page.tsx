import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireWorkspace } from '@/lib/session'

export const metadata = { title: 'Work' }
const PAGES: [string, string, string][] = [['crm', 'Contacts and CRM', 'Contacts and the deals pipeline'], ['invoicing', 'Invoicing', 'Quotes, invoices, payments and receipts'], ['inventory', 'Inventory', 'Products and stock'], ['accounting', 'Accounting and ledger', 'Trial balance']]

export default async function Work({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const sp = await searchParams; const ctx = await requireWorkspace()
  const { data: bl } = await ctx.sb.from('lois_businesses').select('business_id,name').eq('tenant_id', ctx.ws.tenant_id).order('created_at')
  const biz = (bl ?? []).find((x) => x.business_id === sp.b) ?? (bl ?? [])[0]
  if (!biz) redirect('/app/areas')
  const { data: on } = await ctx.sb.from('lois_business_areas').select('area_code').eq('business_id', biz.business_id).eq('state', 'on').eq('active', true)
  const open = PAGES.filter(([c]) => (on ?? []).some((o) => o.area_code === c))
  return (
    <div className="stack"><div><h1>Work</h1><p className="muted">The areas switched on for <b>{biz.name}</b>. Switch more on in <Link href={`/app/areas?b=${biz.business_id}`}>Business areas</Link>.</p>
      <nav className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }} aria-label="Business">{(bl ?? []).map((b) => <Link key={b.business_id} href={`/app/work?b=${b.business_id}`} className={`btn small ${b.business_id === biz.business_id ? '' : 'ghost'}`}>{b.name}</Link>)}</nav></div>
      <div className="grid two">{open.length ? open.map(([c, t, d]) => <Link key={c} href={`/app/work/${c}?b=${biz.business_id}`} className="card"><h2 className="mono">{t}</h2><p className="muted">{d}</p></Link>) : <p className="muted">No working areas are on yet.</p>}</div></div>
  )
}
