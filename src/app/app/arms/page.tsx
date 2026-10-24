import { requireInternal } from '@/lib/session'
import { Guide, Pill } from '@/components/ui'

export const metadata = { title: 'Business arms' }
type Kpi = { label: string; value: string; target: string; source: string; action: string }

export default async function Arms() {
  const ctx = await requireInternal()
  const { data: arms } = await ctx.sb.from('lois_arms').select('arm_id, name, blurb, kpis').eq('tenant_id', ctx.ws.tenant_id).order('created_at')
  return (
    <div className="stack">
      <div>
        <h1>Business arms</h1>
        <p className="muted">The divisions and shared services, with the numbers LOIS will track once their sources are connected.</p>
      </div>
      <Guide
        what="One card per business arm. A figure appears only when it has a source."
        doit="Look at the target and the follow-up on each line. Connect the named source to turn a dash into a verified figure."
        dont="A dash means not known yet; it is not zero. Do not quote a figure to a client or a bank unless its source is shown."
      />
      <div className="grid two">
        {arms?.length ? (
          arms.map((a) => {
            const kpis = (Array.isArray(a.kpis) ? a.kpis : []) as Kpi[]
            return (
              <section className="card" key={a.arm_id}>
                <div className="row" style={{ justifyContent: 'space-between' }}><h3>{a.name}</h3><Pill tone={kpis.length ? 'ok' : 'none'}>{kpis.length ? 'Tracked' : 'Not connected'}</Pill></div>
                {a.blurb && <p className="muted">{a.blurb}</p>}
                {kpis.map((k) => (
                  <div key={k.label} style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}><b>{k.label}</b><span>{k.value}</span></div>
                    <div className="muted small">Target {k.target} · Source: {k.source} · Follow-up: {k.action}</div>
                  </div>
                ))}
              </section>
            )
          })
        ) : (
          <p className="muted">No business arms are set up in this workspace.</p>
        )}
      </div>
    </div>
  )
}
