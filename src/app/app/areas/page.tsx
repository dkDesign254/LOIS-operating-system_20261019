import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { SubmitButton } from '@/components/submit-button'
import { groupAreas, areaState, missingNeeds, dependants, type Area, type BizArea } from '@/lib/areas'
import { addBusiness, setArea, setShare } from './actions'

export const metadata = { title: 'Business areas' }
const DONE: Record<string, string> = { on: 'Area switched on.', off: 'Area switched off.', business: 'Business added with the core areas on.', share: 'Sharing updated and logged.' }
const DATASETS = [['contacts', 'Contacts'], ['products', 'Products'], ['stock', 'Stock'], ['ledger', 'Ledger']] as const
const STATUS: Record<string, string> = { live: 'Live', beta: 'Beta', planned: 'Planned' }

export default async function Areas({ searchParams }: { searchParams: Promise<{ b?: string; error?: string; done?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  const [{ data: areasRaw }, { data: bizRaw }, { data: baRaw }, { data: shareRaw }] = await Promise.all([
    ctx.sb.from('lois_areas').select('*').order('sort'),
    ctx.sb.from('lois_businesses').select('business_id,name,sector,currency').eq('tenant_id', ctx.ws.tenant_id).order('created_at'),
    ctx.sb.from('lois_business_areas').select('business_id,area_code,state,active').eq('tenant_id', ctx.ws.tenant_id),
    ctx.sb.from('lois_business_shares').select('from_business,to_business,dataset').eq('tenant_id', ctx.ws.tenant_id),
  ])
  const areas = (areasRaw ?? []) as Area[]; const biz = bizRaw ?? []
  const cur = biz.find((b) => b.business_id === sp.b) ?? biz[0]
  const mine = ((baRaw ?? []) as (BizArea & { business_id: string })[]).filter((x) => x.business_id === cur?.business_id)
  const nameOf = (c: string) => areas.find((a) => a.code === c)?.name ?? c
  const onCount = areas.filter((a) => ['core', 'on'].includes(areaState(a, mine))).length

  return (
    <div className="stack">
      <div><h1>Business areas</h1>
        <p className="muted">Choose the parts of running a business that you want LOIS to handle, business by business. Each area matches a job function (sales, finance, warehouse, marketing and so on), the same way Odoo and Zoho split their apps. The sandbox lets you try an area on sample data first; switching it on here is what makes it yours.</p></div>
      {sp.error && <p className="err" role="alert">{sp.error}</p>}
      {sp.done && <p className="ok" role="status">{DONE[sp.done]}</p>}

      <section className="card" aria-labelledby="biz-h"><h2 id="biz-h" className="mono">Your businesses</h2>
        <p className="muted small">One workspace can hold several businesses or arms. Each has its own areas. Data can stay separate or be shared on purpose (below).</p>
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          {biz.map((b) => <Link key={b.business_id} href={`/app/areas?b=${b.business_id}`} className={`btn small ${b.business_id === cur?.business_id ? '' : 'ghost'}`} aria-current={b.business_id === cur?.business_id ? 'page' : undefined}>{b.name}</Link>)}
        </div>
        {ctx.isAdmin && (
          <form className="grid two" style={{ marginTop: '1rem' }}>
            <div><label htmlFor="bn">Add a business</label><input id="bn" name="name" required minLength={2} maxLength={80} placeholder="For example: Storymoja" /></div>
            <div><label htmlFor="bs">Sector (optional)</label><input id="bs" name="sector" maxLength={80} placeholder="Publishing, retail, consulting" /></div>
            <div><label htmlFor="bc">Currency</label><input id="bc" name="currency" maxLength={3} defaultValue="KES" /></div>
            <div style={{ alignSelf: 'end' }}><SubmitButton className="btn" formAction={addBusiness} pendingText="Adding…">Add business</SubmitButton></div>
          </form>)}
      </section>

      {cur && (<>
        <p className="muted"><b>{cur.name}</b>: {onCount} of {areas.length} areas on. {!ctx.isAdmin && 'Only an owner or admin can change areas.'}</p>
        {groupAreas(areas).map(([grp, list]) => (
          <section key={grp} className="card" aria-labelledby={'g-' + grp}><h2 id={'g-' + grp} className="mono">{grp}</h2>
            <ul className="plainlist">{list.map((a) => {
              const st = areaState(a, mine); const need = missingNeeds(a, mine, areas); const dep = dependants(a, mine, areas)
              return (
                <li key={a.code} style={{ padding: '0.8rem 0' }}>
                  <b>{a.name}</b> <span className={`chip ${a.status === 'live' ? 'approved' : ''}`}>{STATUS[a.status]}</span> {st === 'core' && <span className="chip">always on</span>} {st === 'on' && <span className="chip approved">ON</span>} {st === 'wanted' && <span className="chip">wanted</span>}
                  <p className="muted small" style={{ margin: '0.2rem 0' }}>{a.summary}</p>
                  <p className="small" style={{ margin: '0.2rem 0' }}>For: {a.jobs.join(', ')}. Like Odoo {a.odoo ?? '–'} / Zoho {a.zoho ?? '–'}.{a.requires.length > 0 && <> Needs: {a.requires.map(nameOf).join(', ')}.</>}{a.feeds.length > 0 && <> Feeds: {a.feeds.map(nameOf).join(', ')}.</>}</p>
                  {ctx.isAdmin && st !== 'core' && (
                    <form className="row" style={{ gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input type="hidden" name="business" value={cur.business_id} /><input type="hidden" name="area" value={a.code} />
                      {st === 'off' || (st === 'wanted' && a.status !== 'planned') ? (<>
                        {a.status !== 'planned' && need.length > 0 && <label className="small"><input type="checkbox" name="with_needs" value="1" /> Also switch on {need.map(nameOf).join(', ')}</label>}
                        <SubmitButton className="btn small" formAction={setArea.bind(null, '1')} pendingText="Saving…">{a.status === 'planned' ? 'I want this' : 'Switch on'}</SubmitButton></>) : (
                        <SubmitButton className="btn ghost small" formAction={setArea.bind(null, '0')} disabled={dep.length > 0} pendingText="Saving…">{st === 'wanted' ? 'Remove my interest' : 'Switch off'}</SubmitButton>)}
                      {dep.length > 0 && st === 'on' && <span className="muted small">Still needed by {dep.join(', ')}.</span>}
                      {st === 'off' && a.status !== 'planned' && <Link href="/app/sandbox" className="small">Try it in the sandbox first</Link>}
                    </form>)}
                  {!ctx.isAdmin && st === 'off' && a.status !== 'planned' && <Link href="/app/sandbox" className="small">Try it in the sandbox</Link>}
                </li>)
            })}</ul>
          </section>))}

        {ctx.isAdmin && biz.length > 1 && (
          <section className="card" aria-labelledby="sh-h"><h2 id="sh-h" className="mono">Sharing between businesses</h2>
            <p className="muted small">Businesses do not see each other's data unless you share it. Choose what {cur.name} shares with another business of yours (for example the same customer list). Each change is logged.</p>
            {biz.filter((b) => b.business_id !== cur.business_id).map((o) => (
              <div key={o.business_id} style={{ padding: '0.5rem 0' }}><b>{cur.name} → {o.name}</b>
                <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>{DATASETS.map(([d, label]) => {
                  const on = (shareRaw ?? []).some((s) => s.from_business === cur.business_id && s.to_business === o.business_id && s.dataset === d)
                  return (<form key={d}><input type="hidden" name="from" value={cur.business_id} /><input type="hidden" name="to" value={o.business_id} /><input type="hidden" name="dataset" value={d} />
                    <SubmitButton className={`btn small ${on ? '' : 'ghost'}`} formAction={setShare.bind(null, on ? '0' : '1')} pendingText="Saving…" aria-pressed={on}>{label}: {on ? 'shared' : 'private'}</SubmitButton></form>)
                })}</div></div>))}
          </section>)}
      </>)}
    </div>
  )
}
