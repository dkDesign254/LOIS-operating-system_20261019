import { workArea, money } from '@/lib/erp'
import { WorkHead } from '@/components/work-head'
import { SubmitButton } from '@/components/submit-button'
import { newNote, noteStatus } from '../actions'

export const metadata = { title: 'Promissory notes' }

export default async function Promissory({ searchParams }: { searchParams: Promise<{ b?: string; error?: string; done?: string; receipt?: string }> }) {
  const sp = await searchParams
  const { ctx, biz, bizList, scope } = await workArea('promissory', 'Promissory notes and credit', sp.b)
  const [{ data: notes }, { data: contacts }, { data: docs }] = await Promise.all([
    ctx.sb.from('erp_promissory_notes').select('note_id,number,contact_id,principal,interest_bp,issued_on,due_on,status,signed_by_name,signed_on,terms,currency').eq('tenant_id', ctx.ws.tenant_id).eq('business_id', biz.business_id).order('created_at', { ascending: false }),
    ctx.sb.from('erp_contacts').select('contact_id,name').eq('tenant_id', ctx.ws.tenant_id).or(scope('contacts')).order('name'),
    ctx.sb.from('erp_docs').select('doc_id,number,total').eq('tenant_id', ctx.ws.tenant_id).eq('business_id', biz.business_id).eq('kind', 'invoice').not('number', 'is', null).order('created_at', { ascending: false }).limit(50),
  ])
  const nm = new Map((contacts ?? []).map((c) => [c.contact_id, c.name])); const cur = biz.currency ?? 'KES'
  const hid = <input type="hidden" name="b" value={biz.business_id} />
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="stack">
      <WorkHead title="Promissory notes and credit" intro="A written promise to pay, for customers who buy on credit. Draft it, record who signed, and mark it settled or defaulted. A signed note cannot be edited, only settled, defaulted or voided." area="promissory" biz={biz} bizList={bizList} sp={sp} />
      <section className="card"><h2 className="mono">Notes</h2>
        {notes?.length ? <ul className="plainlist">{notes.map((n) => (
          <li key={n.note_id} style={{ padding: '0.7rem 0' }}><b>{n.number}</b> <span className={`chip ${n.status === 'settled' ? 'approved' : ''}`}>{n.status}</span> {nm.get(n.contact_id)} · {money(n.principal, n.currency)} · {n.interest_bp / 100}% · due {n.due_on}
            {n.signed_by_name && <p className="muted small">Signed by {n.signed_by_name} on {n.signed_on}.</p>}{n.terms && <p className="muted small">{n.terms}</p>}
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              {n.status === 'draft' && <form className="row" style={{ gap: '0.4rem' }}>{hid}<input type="hidden" name="id" value={n.note_id} /><label className="sr-only" htmlFor={'sg' + n.note_id}>Signer</label><input id={'sg' + n.note_id} name="signer" placeholder="Name of person who signed" maxLength={120} /><SubmitButton className="btn small" formAction={noteStatus.bind(null, 'signed')} pendingText="…">Record signature</SubmitButton></form>}
              {n.status === 'signed' && <><form>{hid}<input type="hidden" name="id" value={n.note_id} /><SubmitButton className="btn small" formAction={noteStatus.bind(null, 'settled')} pendingText="…">Mark settled</SubmitButton></form><form>{hid}<input type="hidden" name="id" value={n.note_id} /><SubmitButton className="btn ghost small" formAction={noteStatus.bind(null, 'defaulted')} pendingText="…">Mark defaulted</SubmitButton></form></>}
              {['draft', 'signed'].includes(n.status) && <form>{hid}<input type="hidden" name="id" value={n.note_id} /><SubmitButton className="btn ghost small" formAction={noteStatus.bind(null, 'void')} pendingText="…">Void</SubmitButton></form>}
            </div></li>))}</ul> : <p className="muted">No notes yet.</p>}
      </section>
      <form className="card grid two"><h2 className="mono" style={{ gridColumn: '1/-1' }}>New note</h2>{hid}
        <div><label htmlFor="nc">Customer</label><select id="nc" name="contact">{(contacts ?? []).map((c) => <option key={c.contact_id} value={c.contact_id}>{c.name}</option>)}</select></div>
        <div><label htmlFor="np">Amount ({cur})</label><input id="np" name="principal" required inputMode="decimal" /></div>
        <div><label htmlFor="nr">Interest % per the whole term</label><input id="nr" name="rate" inputMode="decimal" defaultValue="0" /></div>
        <div><label htmlFor="nd">Due date</label><input id="nd" name="due" type="date" min={today} required /></div>
        <div><label htmlFor="ni">Linked invoice (optional)</label><select id="ni" name="doc"><option value="">None</option>{(docs ?? []).map((d) => <option key={d.doc_id} value={d.doc_id}>{d.number} {money(d.total, cur)}</option>)}</select></div>
        <div><label htmlFor="nt">Terms</label><input id="nt" name="terms" maxLength={1000} placeholder="Payable in full on the due date" /></div>
        <SubmitButton className="btn" formAction={newNote} pendingText="Saving…">Draft note</SubmitButton>
        <p className="muted small" style={{ gridColumn: '1/-1' }}>Have an advocate review your standard wording before you rely on these notes. See Volume 9 for the review notes.</p></form>
    </div>
  )
}
