import { workArea, money } from '@/lib/erp'
import { WorkHead } from '@/components/work-head'
import { SubmitButton } from '@/components/submit-button'
import { addProduct, adjustStock } from '../actions'

export const metadata = { title: 'Inventory' }

export default async function Inventory({ searchParams }: { searchParams: Promise<{ b?: string; error?: string; done?: string }> }) {
  const sp = await searchParams
  const { ctx, biz, bizList, scope } = await workArea('inventory', 'Inventory', sp.b)
  const [{ data: prods }, { data: stock }] = await Promise.all([
    ctx.sb.from('erp_products').select('product_id,sku,name,unit,price,cost,tax_rate_bp,tracks_stock').eq('tenant_id', ctx.ws.tenant_id).or(scope('products')).order('name'),
    ctx.sb.rpc('erp_stock_on_hand', { p_tenant: ctx.ws.tenant_id }),
  ])
  const on = new Map((stock ?? []).map((r: { product_id: string; on_hand: number }) => [r.product_id, Number(r.on_hand)]))
  const cur = biz.currency ?? 'KES'
  return (
    <div className="stack">
      <WorkHead title="Inventory" intro="Products and stock levels. Issuing an invoice reduces stock automatically; you add stock when goods arrive." area="inventory" biz={biz} bizList={bizList} sp={sp} />
      <section className="card"><h2 className="mono">Products and stock</h2>
        {prods?.length ? <div style={{ overflowX: 'auto' }}><table><thead><tr><th>SKU</th><th>Name</th><th>Price</th><th>Cost</th><th>VAT</th><th>On hand</th></tr></thead><tbody>{prods.map((p) => <tr key={p.product_id}><td>{p.sku}</td><td>{p.name}</td><td>{money(p.price, cur)}</td><td>{money(p.cost, cur)}</td><td>{p.tax_rate_bp / 100}%</td><td>{p.tracks_stock ? (on.get(p.product_id) ?? 0) + ' ' + p.unit : 'not tracked'}</td></tr>)}</tbody></table></div> : <p className="muted">No products yet.</p>}
      </section>
      <form className="card grid two"><h2 className="mono" style={{ gridColumn: '1/-1' }}>Add a product</h2><input type="hidden" name="b" value={biz.business_id} />
        <div><label htmlFor="ps">SKU</label><input id="ps" name="sku" required maxLength={60} /></div><div><label htmlFor="pn">Name</label><input id="pn" name="name" required maxLength={160} /></div>
        <div><label htmlFor="pp">Selling price ({cur})</label><input id="pp" name="price" required inputMode="decimal" /></div><div><label htmlFor="pc">Cost ({cur})</label><input id="pc" name="cost" inputMode="decimal" defaultValue="0" /></div>
        <div><label htmlFor="pt">VAT %</label><input id="pt" name="tax" inputMode="decimal" defaultValue="16" /></div><div><label htmlFor="pu">Unit</label><input id="pu" name="unit" defaultValue="unit" maxLength={20} /></div>
        <label className="small" style={{ gridColumn: '1/-1' }}><input type="checkbox" name="tracks" value="1" defaultChecked /> Track stock for this product</label>
        <SubmitButton className="btn" formAction={addProduct} pendingText="Saving…">Add product</SubmitButton></form>
      {!!prods?.length && <form className="card grid two"><h2 className="mono" style={{ gridColumn: '1/-1' }}>Change stock</h2><input type="hidden" name="b" value={biz.business_id} />
        <div><label htmlFor="sp">Product</label><select id="sp" name="product">{prods.filter((p) => p.tracks_stock).map((p) => <option key={p.product_id} value={p.product_id}>{p.sku} {p.name}</option>)}</select></div>
        <div><label htmlFor="sq">Quantity (negative removes)</label><input id="sq" name="qty" required inputMode="decimal" /></div>
        <div><label htmlFor="sr">Reason</label><select id="sr" name="reason"><option value="purchase">Goods received</option><option value="opening">Opening stock</option><option value="adjustment">Count adjustment</option><option value="return">Customer return</option></select></div>
        <div><label htmlFor="sn">Note</label><input id="sn" name="note" maxLength={200} /></div>
        <SubmitButton className="btn" formAction={adjustStock} pendingText="Saving…">Update stock</SubmitButton></form>}
    </div>
  )
}
