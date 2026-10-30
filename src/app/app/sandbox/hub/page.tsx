import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { USE_CASES } from '@/lib/use-cases'

export const metadata = { title: 'Use case hub' }

export default async function Hub() {
  const ctx = await requireWorkspace()
  const { data: u } = await ctx.sb.rpc('lois_runs_today', { p_tenant: ctx.ws.tenant_id })
  const use = (u ?? { test_used: 0, test_cap: 10, live_used: 0, live_cap: 3 }) as { test_used: number; test_cap: number; live_used: number; live_cap: number }
  return (
    <div className="stack">
      <div className="tabs">
        <Link href="/app/sandbox">Dry run and tools</Link>
        <Link href="/app/sandbox/hub" aria-current="page">Use case hub</Link>
        <Link href="/app/sandbox/studio">AI Studio</Link>
      </div>
      <div>
        <h1>Use case hub</h1>
        <p className="muted">Each use case is a complete piece of work, such as managing social media or invoicing customers. Try it as a template with example data, or set it up for your business. Test runs never reach real people.</p>
        <p className="small">Today: <b>{use.test_used}</b> of {use.test_cap} test runs, <b>{use.live_used}</b> of {use.live_cap} live runs. <Link href="/app/sandbox/hub/runs">All runs</Link>{ctx.isAdmin && <> · <Link href="/app/connectors">Connectors</Link></>}</p>
      </div>
      <div className="grid two">
        {USE_CASES.map((c) => (
          <article key={c.slug} className="card">
            <p className="marker mono">{c.category.toUpperCase()}</p>
            <h2 style={{ margin: 0 }}><Link href={`/app/sandbox/hub/${c.slug}`}>{c.title}</Link></h2>
            <p className="muted">{c.summary}</p>
            <p className="small">{c.steps.length} steps · {c.steps.filter((s) => s.kind === 'person').length} decision by a person · {c.outward ? 'reaches outside LOIS only after approval' : 'stays inside LOIS'}</p>
            <Link className="btn" href={`/app/sandbox/hub/${c.slug}`}>Open</Link>
          </article>
        ))}
      </div>
    </div>
  )
}
