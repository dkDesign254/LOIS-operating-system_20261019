import { workArea, money } from '@/lib/erp'
import { WorkHead } from '@/components/work-head'
import { SubmitButton } from '@/components/submit-button'
import { addContact, addDeal, moveDeal } from '../actions'

export const metadata = { title: 'Contacts and CRM' }
const STAGES = ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

export default async function Crm({ searchParams }: { searchParams: Promise<{ b?: string; error?: string; done?: string }> }) {
  const sp = await searchParams
  const { ctx, biz, bizList, scope } = await workArea('crm', 'Contacts and CRM', sp.b)
  const [{ data: contacts }, { data: deals }] = await Promise.all([
    ctx.sb.from('erp_contacts').select('contact_id,kind,name,email,phone,credit_limit,payment_terms_days').eq('tenant_id', ctx.ws.tenant_id).or(scope('contacts')).order('created_at', { ascending: false }).limit(100),
    ctx.sb.from('erp_deals').select('deal_id,title,stage,value,contact_id').eq('tenant_id', ctx.ws.tenant_id).or(`business_id.is.null,business_id.eq.${biz.business_id}`).order('updated_at', { ascending: false }).limit(200),
  ])
  const cur = biz.currency ?? 'KES'
  return (
    <div className="stack">
      <WorkHead title="Contacts and CRM" intro="Customers, suppliers and leads, and the deals you are working. Contacts feed quotes and invoices." area="crm" biz={biz} bizList={bizList} sp={sp} />
      <section className="card"><h2 className="mono">Deals pipeline</h2>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '0.8rem' }}>{STAGES.map((st) => {
          const list = (deals ?? []).filter((d) => d.stage === st)
          return (<div key={st}><h3 className="small mono">{st} ({list.length}) {money(list.reduce((a, d) => a + Number(d.value), 0), cur)}</h3>
            {list.map((d) => (<form key={d.deal_id} className="card" style={{ padding: '0.5rem' }}><input type="hidden" name="b" value={biz.business_id} /><input type="hidden" name="id" value={d.deal_id} />
              <b className="small">{d.title}</b><p className="muted small">{money(d.value, cur)}</p>
              <label className="sr-only" htmlFor={'s' + d.deal_id}>Move to</label><select id={'s' + d.deal_id} name="stage" defaultValue={d.stage}>{STAGES.map((x) => <option key={x}>{x}</option>)}</select>
              <SubmitButton className="btn ghost small" formAction={moveDeal} pendingText="…">Move</SubmitButton></form>))}</div>)
        })}</div>
        <form className="grid two" style={{ marginTop: '1rem' }}><input type="hidden" name="b" value={biz.business_id} />
          <div><label htmlFor="dt">New deal</label><input id="dt" name="title" required maxLength={160} placeholder="Supply contract for…" /></div>
          <div><label htmlFor="dv">Expected value ({cur})</label><input id="dv" name="value" inputMode="decimal" placeholder="0" /></div>
          <div><label htmlFor="dc">Contact</label><select id="dc" name="contact"><option value="">None</option>{(contacts ?? []).map((c) => <option key={c.contact_id} value={c.contact_id}>{c.name}</option>)}</select></div>
          <div style={{ alignSelf: 'end' }}><SubmitButton className="btn" formAction={addDeal} pendingText="Saving…">Add deal</SubmitButton></div></form>
      </section>
      <section className="card"><h2 className="mono">Contacts</h2>
        {contacts?.length ? <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th>Credit limit</th><th>Terms</th></tr></thead><tbody>{contacts.map((c) => <tr key={c.contact_id}><td>{c.name}</td><td>{c.kind}</td><td>{c.email}</td><td>{c.phone}</td><td>{c.credit_limit ? money(c.credit_limit, cur) : '–'}</td><td>{c.payment_terms_days} days</td></tr>)}</tbody></table></div> : <p className="muted">No contacts yet.</p>}
        <form className="grid two" style={{ marginTop: '1rem' }}><input type="hidden" name="b" value={biz.business_id} />
          <div><label htmlFor="cn">Name</label><input id="cn" name="name" required minLength={2} maxLength={160} /></div>
          <div><label htmlFor="ck">Type</label><select id="ck" name="kind"><option>customer</option><option>supplier</option><option>lead</option><option>both</option></select></div>
          <div><label htmlFor="ce">Email</label><input id="ce" name="email" type="email" maxLength={200} /></div>
          <div><label htmlFor="cp">Phone</label><input id="cp" name="phone" maxLength={40} /></div>
          <div><label htmlFor="cl">Credit limit ({cur}, 0 = none)</label><input id="cl" name="credit_limit" inputMode="decimal" defaultValue="0" /></div>
          <div><label htmlFor="ct">Payment terms (days)</label><input id="ct" name="terms" inputMode="numeric" defaultValue="14" /></div>
          <div><label htmlFor="ck2">KRA PIN</label><input id="ck2" name="kra_pin" maxLength={20} /></div>
          <div style={{ alignSelf: 'end' }}><SubmitButton className="btn" formAction={addContact} pendingText="Saving…">Add contact</SubmitButton></div></form>
      </section>
    </div>
  )
}
