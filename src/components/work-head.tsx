import Link from 'next/link'

const DONE: Record<string, string> = { contact: 'Contact saved.', deal: 'Deal saved.', product: 'Product saved.', stock: 'Stock updated.', draft: 'Draft saved. Issue it when it is ready.', issued: 'Issued and posted to the ledger.', waiting: 'Sent for approval. A different owner or admin must issue it.', paid: 'Payment recorded and receipt issued.', note: 'Promissory note drafted.', note_signed: 'Signature recorded.', note_settled: 'Note marked settled.', note_defaulted: 'Note marked defaulted.', note_void: 'Note voided.' }

/** Page heading, business switcher and flash messages shared by the work pages. */
export function WorkHead({ title, intro, area, biz, bizList, sp }: { title: string; intro: string; area: string; biz: { business_id: string; name: string }; bizList: { business_id: string; name: string }[]; sp: { error?: string; done?: string; receipt?: string } }) {
  return (
    <>
      <div><h1>{title}</h1><p className="muted">{intro}</p>
        <nav className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }} aria-label="Business">
          {bizList.map((b) => <Link key={b.business_id} href={`/app/work/${area}?b=${b.business_id}`} className={`btn small ${b.business_id === biz.business_id ? '' : 'ghost'}`} aria-current={b.business_id === biz.business_id ? 'page' : undefined}>{b.name}</Link>)}
          <Link href={`/app/areas?b=${biz.business_id}`} className="small">Business areas</Link></nav></div>
      {sp.error && <p className="err" role="alert">{sp.error}</p>}
      {sp.done && <p className="ok" role="status">{DONE[sp.done] ?? 'Done.'}{sp.receipt ? ` Receipt ${sp.receipt}.` : ''}</p>}
    </>
  )
}
