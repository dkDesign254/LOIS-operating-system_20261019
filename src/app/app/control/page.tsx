import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { BriefMe } from '@/components/control'
import { Guide, Pill, Tile, sevTone } from '@/components/ui'
import { readiness, type Brief, type Challenge } from '@/lib/readiness'
import { addTask, completeTask } from '../control-actions'

export const metadata = { title: 'Start here' }

export default async function Control() {
  const ctx = await requireWorkspace()
  const t = ctx.ws.tenant_id
  const canWrite = ['owner', 'admin', 'reviewer'].includes(ctx.ws.role)
  const [tasks, pending, scen, cont, docs, bank] = await Promise.all([
    ctx.sb.from('lois_tasks').select('task_id, title, why, how, kind, source, priority').eq('tenant_id', t).eq('status', 'open').order('priority').limit(50),
    ctx.sb.from('lois_decision_briefs').select('brief_id, title, risk, amount_kes, evidence_present, evidence_note, evidence_date, deadline, source_state, status, requester, challenge').eq('tenant_id', t).in('status', ['pending', 'needs_info']).limit(8),
    ctx.sb.from('lois_scenarios').select('is_on, state').eq('tenant_id', t),
    ctx.sb.from('lois_continuity_items').select('item, status, severity').eq('tenant_id', t).order('sort'),
    ctx.sb.from('lois_documents').select('document_id', { count: 'exact', head: true }).eq('tenant_id', t).eq('status', 'active'),
    ctx.sb.from('lois_knowledge_items').select('knowledge_id', { count: 'exact', head: true }).eq('tenant_id', t).eq('status', 'approved'),
  ])
  const openTasks = tasks.data ?? []
  const decisions = pending.data ?? []
  const scenarios = scen.data ?? []
  const failing = scenarios.filter((s) => s.state === 'failing').length
  const unknowns = (cont.data ?? []).filter((c) => c.status === 'Not started' || c.severity === 'crit')

  return (
    <div className="stack">
      <div>
        <h1>Start here</h1>
        <p className="muted">Clarity for the decision in front of you. LOIS prepares and recommends; a person decides.</p>
      </div>
      <Guide
        open
        what="The front door to LOIS. It shows what needs you, what is failing, and what LOIS knows."
        doit="Do the first action on the list. Press Brief me for a summary. Open Learn LOIS if you are new."
        dont="Do not read a dash as zero: it means not known yet. Do not treat reported items as verified."
      />
      <div className="strip">
        <Tile k="Needs a decision" v={decisions.length} s="requests waiting" pill={decisions.length ? ['warn', 'Action'] : ['none', 'Clear']} />
        <Tile k="Failing now" v={scenarios.length ? failing : '—'} s="automations, last reported run" pill={failing ? ['crit', 'Attention'] : scenarios.length ? ['ok', 'Clear'] : ['none', 'Not known']} />
        <Tile k="Open actions" v={openTasks.length} s="on your list" />
        <Tile k="Automations" v={scenarios.length || '—'} s={`${scenarios.filter((s) => s.is_on).length} switched on`} />
        <Tile k="Knowledge" v={`${docs.count ?? 0} / ${bank.count ?? 0}`} s="documents / accepted entries" />
      </div>

      <section className="card">
        <h2>Decision readiness</h2>
        <p className="muted small">Five separate measures. No single score.</p>
        <div className="grid two">
          <div>
            <b>What we know</b>
            <ul className="tight do">
              <li>Phase 1 only recommends and never acts (execution: NO).</li>
              <li>{docs.count ?? 0} active documents and {bank.count ?? 0} accepted bank entries in this workspace.</li>
              {scenarios.length > 0 && <li>{scenarios.length} automations are registered (reported snapshot, not live).</li>}
            </ul>
          </div>
          <div>
            <b>What we do not know yet</b>
            <ul className="tight dont">
              {unknowns.length ? unknowns.map((u) => <li key={u.item}>{u.item}</li>) : <li>Nothing recorded as unknown. That is not the same as nothing unknown.</li>}
            </ul>
          </div>
        </div>
        <b style={{ display: 'block', marginTop: 12 }}>Decisions waiting</b>
        {decisions.length ? (
          <ul className="list">
            {decisions.map((d) => {
              const ms = readiness(d as unknown as Brief, (d.challenge ?? []) as Challenge[], canWrite)
              return (
                <li key={d.brief_id}>
                  <div className="l">
                    <b>{d.title}</b>
                    <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      {ms.map((m) => <Pill key={m.key} tone={m.status}>{m.label}: {m.text}</Pill>)}
                    </div>
                  </div>
                  <Link className="btn small" href={`/app/decisions/${d.brief_id}`}>Open brief</Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="muted">No decisions waiting. <Link href="/app/decisions">Start one</Link>.</p>
        )}
      </section>

      <section className="card">
        <h2>Your next actions</h2>
        {openTasks.length ? (
          <ul className="list">
            {openTasks.slice(0, 8).map((x) => (
              <li key={x.task_id}>
                <div className="l">
                  <b>{x.title}</b>
                  {x.why && <div className="muted">{x.why}</div>}
                  {x.how && <ul className="tight"><li>{x.how}</li></ul>}
                  <div className="muted small">Source: {x.source ?? 'not recorded'}</div>
                </div>
                <div className="row">
                  <Pill tone={x.kind === 'blocker' ? 'crit' : x.kind === 'learn' ? 'info' : 'warn'}>{x.kind}</Pill>
                  <form action={completeTask}><input type="hidden" name="id" value={x.task_id} /><button className="btn small">Mark done</button></form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nothing open. Add an action below, or ask LOIS what to do next.</p>
        )}
        <details style={{ marginTop: 10 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Add an action</summary>
          <ActionForm action={addTask} submit="Add action">
            <div className="field"><label htmlFor="t">Action</label><input id="t" type="text" name="title" required maxLength={300} /></div>
            <div className="field"><label htmlFor="w">Why it matters (optional)</label><input id="w" type="text" name="why" maxLength={400} /></div>
            <div className="grid two">
              <div className="field"><label htmlFor="k">Kind</label><select id="k" name="kind"><option value="setup">setup</option><option value="blocker">blocker</option><option value="learn">learn</option></select></div>
              <div className="field"><label htmlFor="p">Priority (1 first)</label><select id="p" name="priority" defaultValue="3">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select></div>
            </div>
          </ActionForm>
        </details>
      </section>

      <div className="grid two">
        <section className="card"><h3>Brief me</h3><BriefMe /></section>
        <section className="card">
          <h3>How to read status</h3>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            <Pill tone="ok">Verified</Pill><Pill tone="info">Reported</Pill><Pill tone="warn">In progress</Pill><Pill tone="crit">Blocked</Pill><Pill>Not started</Pill>
          </div>
          <p className="muted">Verified means a person checked it. Reported means someone told us and it has not been checked. LOIS never shows a made-up figure as fact. {cont.data?.length ? '' : ''}</p>
          <p><Link href="/app/learn" className="btn ghost small">New here? Take the tour</Link></p>
        </section>
      </div>
    </div>
  )
}
