import { requireWorkspace } from '@/lib/session'
import { Guide, Pill, Tile, sevTone } from '@/components/ui'

export const metadata = { title: 'Data & backups' }

export default async function Continuity() {
  const ctx = await requireWorkspace()
  const { data: rows } = await ctx.sb.from('lois_continuity_items').select('item_id, item, status, severity, source, action').eq('tenant_id', ctx.ws.tenant_id).order('sort')
  const list = rows ?? []
  return (
    <div className="stack">
      <div>
        <h1>Data &amp; backups</h1>
        <p className="muted">Where data lives and whether you could recover it.</p>
      </div>
      <Guide
        what="Status of the places LOIS keeps information and the free backup plan."
        doit="Work the red items from the top. Do the backup drill with fake data before any real data moves."
        dont="Do not move real operational data until a recovery point exists. Do not pay for hosting yet: the plan is free first."
      />
      <div className="strip">
        <Tile k="Verified recovery point" v={0} s="no backup exported and restored" pill={['crit', 'Missing']} />
        <Tile k="Open items" v={list.length || '—'} s={`${list.filter((l) => l.severity === 'crit').length} critical`} />
      </div>
      <section className="card scroll">
        {list.length ? (
          <table>
            <thead><tr><th>Item</th><th>State</th><th>Source</th><th>What to do</th></tr></thead>
            <tbody>{list.map((r) => <tr key={r.item_id} className={`sev ${sevTone(r.severity)}`}><td><b>{r.item}</b></td><td><Pill tone={sevTone(r.severity)}>{r.status}</Pill></td><td>{r.source}</td><td>{r.action}</td></tr>)}</tbody>
          </table>
        ) : (
          <p className="muted">Nothing recorded for this workspace.</p>
        )}
      </section>
      <section className="card">
        <h3>Free backup routine, in order</h3>
        <ol className="tight">
          <li>Export each table to CSV on a schedule.</li>
          <li>Zip, encrypt, and record a checksum for every file.</li>
          <li>Save one copy to Drive and one to a local disk.</li>
          <li>Restore into a scratch space and compare checksums.</li>
          <li>Write the date of the last good restore on this page.</li>
        </ol>
        <p className="muted small">"Reported" rows come from an earlier session and have not been independently checked.</p>
      </section>
    </div>
  )
}
