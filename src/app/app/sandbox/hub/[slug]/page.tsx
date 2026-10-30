import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireWorkspace } from '@/lib/session'
import { bySlug } from '@/lib/use-cases'
import { FRAMEWORKS } from '@/lib/frameworks'
import { SubmitButton } from '@/components/submit-button'
import { saveConfig, runTest, requestLive } from '../actions'

export const metadata = { title: 'Use case' }
const KIND: Record<string, string> = { internal: 'Inside LOIS', external: 'Through your automation', person: 'A person decides' }

export default async function UseCase({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string; saved?: string }> }) {
  const { slug } = await params
  const sp = await searchParams
  const u = bySlug(slug); if (!u) notFound()
  const ctx = await requireWorkspace()
  const { data: uc } = await ctx.sb.from('lois_use_cases').select('use_case_id').eq('slug', slug).maybeSingle()
  const { data: saved } = uc ? await ctx.sb.from('lois_use_case_configs').select('mode,config').eq('tenant_id', ctx.ws.tenant_id).eq('use_case_id', uc.use_case_id).maybeSingle() : { data: null }
  const { data: cons } = await ctx.sb.from('lois_connectors').select('connector_id,label,provider').eq('tenant_id', ctx.ws.tenant_id).eq('enabled', true)
  const mode = (saved?.mode as 'standard' | 'custom') ?? 'standard'
  const cfg = { ...u.standard_config, ...((saved?.config as Record<string, string | number>) ?? {}) }
  const canRun = ['owner', 'admin', 'member'].includes(ctx.ws.role)

  return (
    <div className="stack">
      <p className="small"><Link href="/app/sandbox/hub">← Use case hub</Link></p>
      <div><p className="marker mono">{u.category.toUpperCase()}</p><h1>{u.title}</h1><p className="muted">{u.summary}</p></div>
      {sp.error && <p className="err" role="alert">{sp.error}</p>}
      {sp.saved && <p className="ok" role="status">Configuration saved.</p>}

      <section className="card"><h2 className="mono">What to expect</h2>
        <p>{u.expectation}</p><p className="muted small">How we will know it worked: {u.measure}</p>
        <ol className="plainlist">{u.steps.map((s, i) => (
          <li key={s.key} style={{ padding: '0.5rem 0' }}><b>{i + 1}. {s.name}</b> <span className="chip">{KIND[s.kind]}</span>{s.outward && <span className="chip warn">leaves LOIS</span>}<br />{s.does}<br /><span className="muted small">Why: {s.why} Produces: {s.produces}</span></li>
        ))}</ol>
      </section>

      <form className="card" aria-labelledby="cfg-h">
        <h2 id="cfg-h" className="mono">Configuration</h2>
        <p className="muted small">Use the standard settings to try it as a template, or customise them for your business.</p>
        <fieldset><legend className="small">Which settings?</legend>
          <label><input type="radio" name="config_mode" value="standard" defaultChecked={mode === 'standard'} /> Standard (try it as it comes)</label>{' '}
          <label><input type="radio" name="config_mode" value="custom" defaultChecked={mode === 'custom'} /> Custom (use my edits below)</label>
        </fieldset>
        <div className="grid two">{u.config_fields.map((f) => (
          <div key={f.key}><label htmlFor={'c_' + f.key}>{f.label}</label>
            {f.type === 'select' ? <select id={'c_' + f.key} name={'c_' + f.key} defaultValue={String(cfg[f.key] ?? '')}>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
              : <input id={'c_' + f.key} name={'c_' + f.key} type={f.type === 'number' ? 'number' : 'text'} defaultValue={String(cfg[f.key] ?? '')} />}
            <p className="muted small">{f.help} Standard: {String(u.standard_config[f.key])}</p></div>
        ))}</div>
        <input type="hidden" name="slug" value={slug} />
        {canRun && <SubmitButton className="btn ghost" formAction={saveConfig} pendingText="Saving…">Save my configuration</SubmitButton>}

        <h2 className="mono" style={{ marginTop: '1.5rem' }}>Try it</h2>
        <div className="grid two">{u.inputs.map((f) => (
          <div key={f.key}><label htmlFor={'i_' + f.key}>{f.label}</label><input id={'i_' + f.key} name={'i_' + f.key} type={f.type === 'number' ? 'number' : 'text'} maxLength={400} /><p className="muted small">{f.help}</p></div>
        ))}</div>
        <label htmlFor="why">Why are you running this? (one line)</label><input id="why" name="why" maxLength={300} />
        {canRun ? (
          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
            <SubmitButton className="btn" formAction={runTest} pendingText="Running…">Run a test (nothing is sent)</SubmitButton>
            <SubmitButton className="btn ghost" formAction={requestLive} pendingText="Requesting…" disabled={!u.outward ? false : !cons?.length}>Request a live run</SubmitButton>
          </div>
        ) : <p className="muted">Your role can read this but not run it.</p>}
        <p className="muted small">{cons?.length ? `Live runs go through ${cons.map((c) => c.label).join(', ')} and wait for a second person's approval.` : 'Live runs need a connector that an owner or admin has switched on. Test runs work now.'}</p>
      </form>

      <section className="card"><h2 className="mono">Ways of thinking this teaches</h2>
        <ul className="plainlist">{['doors', 'daci', 'evidence', 'premortem', 'ooda'].map((k) => <li key={k}><b>{FRAMEWORKS[k].name}</b>: {FRAMEWORKS[k].lesson}</li>)}</ul>
        <p className="muted small">After each run, LOIS shows the ones that fit it, with questions to ask.</p></section>
    </div>
  )
}
