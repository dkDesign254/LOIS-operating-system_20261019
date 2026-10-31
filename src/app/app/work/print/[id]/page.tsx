import { notFound } from 'next/navigation'
import { requireWorkspace } from '@/lib/session'
import { money } from '@/lib/erp'
import { PrintButton } from '@/components/print-button'

export const metadata = { title: 'Print' }

export default async function PrintDoc({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await requireWorkspace()
  const { data: d } = await ctx.sb.from('erp_docs').select('doc_id,kind,number,status,business_id,contact_id,currency,issue_date,due_date,subtotal,tax,total,paid,notes').eq('doc_id', id).eq('tenant_id', ctx.ws.tenant_id).maybeSingle()
  if (!d || !d.number) notFound()
  const [{ data: lines }, { data: pays }, { data: c }, { data: b }] = await Promise.all([
    ctx.sb.from('erp_doc_lines').select('line_id,description,qty,unit_price,tax_rate_bp').eq('doc_id', id),
    ctx.sb.from('erp_payments').select('payment_id,receipt_no,amount,method,reference,paid_on').eq('doc_id', id).order('created_at'),
    ctx.sb.from('erp_contacts').select('name,email,phone,kra_pin,address').eq('contact_id', d.contact_id).maybeSingle(),
    ctx.sb.from('lois_businesses').select('name').eq('business_id', d.business_id).maybeSingle(),
  ])
  const title = d.kind === 'quote' ? 'Quote' : d.kind === 'credit_note' ? 'Credit note' : 'Tax invoice'
  return (
    <div className="stack" style={{ maxWidth: '48rem' }}>
      <div className="no-print"><PrintButton /> <span className="muted small">Use your browser's print dialog and choose "Save as PDF" to keep a copy.</span></div>
      <article className="card" aria-label={`${title} ${d.number}`}>
        <h1>{title} {d.number}</h1>
        <p><b>{b?.name}</b><br />Issued {d.issue_date}{d.due_date && d.kind === 'invoice' ? <> · Due {d.due_date}</> : null}</p>
        <p><b>Bill to</b><br />{c?.name}{c?.kra_pin && <><br />KRA PIN {c.kra_pin}</>}{c?.email && <><br />{c.email}</>}{c?.phone && <><br />{c.phone}</>}{c?.address && <><br />{c.address}</>}</p>
        <table><thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>VAT</th><th>Amount</th></tr></thead><tbody>
          {(lines ?? []).map((l) => <tr key={l.line_id}><td>{l.description}</td><td>{Number(l.qty)}</td><td>{money(l.unit_price, d.currency)}</td><td>{l.tax_rate_bp / 100}%</td><td>{money(Math.round(Number(l.qty) * l.unit_price), d.currency)}</td></tr>)}
          <tr><td colSpan={4} style={{ textAlign: 'right' }}>Subtotal</td><td>{money(d.subtotal, d.currency)}</td></tr>
          <tr><td colSpan={4} style={{ textAlign: 'right' }}>VAT</td><td>{money(d.tax, d.currency)}</td></tr>
          <tr><td colSpan={4} style={{ textAlign: 'right' }}><b>Total</b></td><td><b>{money(d.total, d.currency)}</b></td></tr>
          {d.kind === 'invoice' && <><tr><td colSpan={4} style={{ textAlign: 'right' }}>Paid</td><td>{money(d.paid, d.currency)}</td></tr><tr><td colSpan={4} style={{ textAlign: 'right' }}><b>Balance</b></td><td><b>{money(d.total - d.paid, d.currency)}</b></td></tr></>}
        </tbody></table>
        {d.notes && <p className="muted">{d.notes}</p>}
        {!!pays?.length && <><h2 className="mono">Receipts</h2><ul>{pays.map((p) => <li key={p.payment_id}>{p.receipt_no}: {money(p.amount, d.currency)} by {p.method} on {p.paid_on}{p.reference ? ` (${p.reference})` : ''}</li>)}</ul></>}
      </article>
    </div>
  )
}
