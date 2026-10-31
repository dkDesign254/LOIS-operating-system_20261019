import { workArea, money } from '@/lib/erp'
import { WorkHead } from '@/components/work-head'
import { SubmitButton } from '@/components/submit-button'
import Link from 'next/link'
import { saveDraft, saveAndIssue, issueDoc, payDoc } from '../actions'

export const metadata = { title: 'Invoicing' }
const LABEL: Record<string, string> = { draft: 'Draft', awaiting_approval: 'Waiting for approval', issued: 'Issued', partly_paid: 'Part paid', paid: 'Paid', void: 'Void', accepted: 'Accepted', declined: 'Declined' }

export default async function Invoicing({ searchParams }: { searchParams: Promise<{ b?: string; error?: string; done?: string; receipt?: string }> }) {
  const sp = await searchParams
  const { ctx, biz, bizList, scope } = await workArea('invoicing', 'Invoicing', sp.b)
  const [{ data: docs }, { data: contacts }, { data: prods }] = await Promise.all([
    ctx.sb.from('erp_docs').select('doc_id,kind,number,status,contact_id,total,paid,due_date,created_by,currency').eq('tenant_id', ctx.ws.tenant_id).or(`business_id.eq.${biz.business_id}`).order('created_at', { ascending: false }).limit(60),
    ctx.sb.from('erp_contacts').select('contact_id,name').eq('tenant_id', ctx.ws.tenant_id).or(scope('contacts')).order('name'),
    ctx.sb.from('erp_products').select('product_id,sku,name,price').eq('tenant_id', ctx.ws.tenant_id).or(scope('products')).order('name'),
  ])
  const nm = new Map((contacts ?? []).map((c) => [c.contact_id, c.name]))
  const cur = biz.currency ?? 'KES'
  const hidden = <input type="hidden" name="b" value={biz.business_id} />
  return (
    <div className="stack">
      <WorkHead title="Invoicing" intro="Quotes and invoices with VAT. A member's invoice waits for an owner or admin; the person who created it cannot be the one to approve it. Issuing posts to the ledger and takes stock out." area="invoicing" biz={biz} bizList={bizList} sp={sp} />
      <section className="card"><h2 className="mono">Documents</h2>
        {docs?.length ? <ul className="plainlist">{docs.map((d) => (
          <li key={d.doc_id} style={{ padding: '0.7rem 0' }}>
            <b>{d.number ?? 'Not numbered yet'}</b> <span className="chip">{d.kind}</span> <span className={`chip ${d.status === 'paid' ? 'approved' : ''}`}>{LABEL[d.status] ?? d.status}</span> {nm.get(d.contact_id)} · {money(d.total, d.currency)}{d.paid > 0 && <> · paid {money(d.paid, d.currency)}</>}{d.due_date && <> · due {d.due_date}</>}
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
              {d.number && <Link href={`/app/work/print/${d.doc_id}`} className="btn ghost small">Print / PDF</Link>}
              {['draft', 'awaiting_approval'].includes(d.status) && <form>{hidden}<input type="hidden" name="id" value={d.doc_id} /><SubmitButton className="btn small" formAction={issueDoc} pendingText="Working…">{d.status === 'awaiting_approval' ? 'Approve and issue' : 'Issue'}</SubmitButton></form>}
              {d.kind === 'invoice' && ['issued', 'partly_paid'].includes(d.status) && (
                <form className="row" style={{ gap: '0.4rem', flexWrap: 'wrap' }}>{hidden}<input type="hidden" name="id" value={d.doc_id} />
                  <label className="sr-only" htmlFor={'a' + d.doc_id}>Amount received</label><input id={'a' + d.doc_id} name="amount" inputMode="decimal" placeholder={`Received (owed ${money(d.total - d.paid, d.currency)})`} style={{ width: '14rem' }} />
                  <label className="sr-only" htmlFor={'m' + d.doc_id}>Method</label><select id={'m' + d.doc_id} name="method"><option value="bank">Bank</option><option value="mpesa">M-Pesa</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option><option value="other">Other</option></select>
                  <label className="sr-only" htmlFor={'r' + d.doc_id}>Reference</label><input id={'r' + d.doc_id} name="ref" placeholder="Reference" maxLength={200} style={{ width: '10rem' }} />
                  <SubmitButton className="btn small" formAction={payDoc} pendingText="Saving…">Record payment</SubmitButton></form>)}
            </div></li>))}</ul> : <p className="muted">Nothing yet.</p>}
      </section>
      <form className="card"><h2 className="mono">New quote or invoice</h2>{hidden}
        {!contacts?.length ? <p className="muted">Add a contact first in Contacts and CRM.</p> : (<>
          <div className="grid two"><div><label htmlFor="k">Type</label><select id="k" name="kind"><option value="invoice">Invoice</option><option value="quote">Quote</option></select></div>
            <div><label htmlFor="c">Customer</label><select id="c" name="contact">{contacts.map((c) => <option key={c.contact_id} value={c.contact_id}>{c.name}</option>)}</select></div></div>
          {[1, 2, 3, 4].map((i) => (<div key={i} className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: '0.5rem' }}>
            <div><label htmlFor={'p' + i}>Product {i}</label><select id={'p' + i} name={'p' + i}><option value="">Free text</option>{(prods ?? []).map((p) => <option key={p.product_id} value={p.product_id}>{p.sku} {p.name}</option>)}</select></div>
            <div><label htmlFor={'d' + i}>Description</label><input id={'d' + i} name={'d' + i} maxLength={200} /></div>
            <div><label htmlFor={'q' + i}>Qty</label><input id={'q' + i} name={'q' + i} inputMode="decimal" defaultValue={i === 1 ? '1' : ''} /></div>
            <div><label htmlFor={'u' + i}>Unit price ({cur})</label><input id={'u' + i} name={'u' + i} inputMode="decimal" placeholder="from product" /></div></div>))}
          <label htmlFor="nt">Notes</label><input id="nt" name="notes" maxLength={500} />
          <div className="row" style={{ gap: '0.5rem', marginTop: '0.6rem' }}><SubmitButton className="btn ghost" formAction={saveDraft} pendingText="Saving…">Save draft</SubmitButton><SubmitButton className="btn" formAction={saveAndIssue} pendingText="Saving…">Save and issue</SubmitButton></div></>)}
      </form>
    </div>
  )
}
