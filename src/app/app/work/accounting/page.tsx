import { workArea, money } from '@/lib/erp'
import { WorkHead } from '@/components/work-head'

export const metadata = { title: 'Accounting and ledger' }

export default async function Accounting({ searchParams }: { searchParams: Promise<{ b?: string; error?: string; done?: string }> }) {
  const sp = await searchParams
  const { ctx, biz, bizList } = await workArea('accounting', 'Accounting and ledger', sp.b)
  const { data: tb } = await ctx.sb.rpc('erp_trial_balance', { p_tenant: ctx.ws.tenant_id })
  const rows = (tb ?? []) as { code: string; name: string; debit: number; credit: number }[]
  const dr = rows.reduce((a, r) => a + Number(r.debit), 0), cr = rows.reduce((a, r) => a + Number(r.credit), 0)
  const cur = biz.currency ?? 'KES'
  return (
    <div className="stack">
      <WorkHead title="Accounting and ledger" intro="The trial balance for the workspace. It is built only from issued invoices and recorded receipts, so debits always equal credits." area="accounting" biz={biz} bizList={bizList} sp={sp} />
      <section className="card"><h2 className="mono">Trial balance</h2>
        {rows.length ? <div style={{ overflowX: 'auto' }}><table><thead><tr><th>Code</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{rows.map((r) => <tr key={r.code}><td>{r.code}</td><td>{r.name}</td><td>{money(r.debit, cur)}</td><td>{money(r.credit, cur)}</td></tr>)}<tr><td></td><td><b>Total</b></td><td><b>{money(dr, cur)}</b></td><td><b>{money(cr, cur)}</b></td></tr></tbody></table></div> : <p className="muted">No accounts yet. They appear when you issue your first invoice.</p>}
        <p className="muted small">Ledger entries are not split by business yet: this view covers the whole workspace.</p></section>
    </div>
  )
}
