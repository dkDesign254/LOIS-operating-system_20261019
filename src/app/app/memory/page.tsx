import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { Guide, Pill, fmt } from '@/components/ui'
import { addMemory } from '../control-actions'

export const metadata = { title: 'Memory' }
const TYPES = ['all', 'fact', 'decision', 'lesson', 'risk', 'idea']

export default async function Memory({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()
  const type = TYPES.includes(sp.type ?? '') ? sp.type! : 'all'
  let q = ctx.sb.from('lois_memory').select('memory_id, type, text, source, example, created_at').eq('tenant_id', ctx.ws.tenant_id).order('created_at', { ascending: false }).limit(100)
  if (type !== 'all') q = q.eq('type', type)
  const { data: rows } = await q
  return (
    <div className="stack">
      <div>
        <h1>Memory</h1>
        <p className="muted">Everything worth remembering: facts, decisions, lessons, risks and ideas. <Link href="/app">Ask LOIS</Link> for answers from your approved knowledge.</p>
      </div>
      <Guide
        what="A shared notebook for the workspace. Lessons from learning reviews and sandbox ratings land here too."
        doit="Add one line whenever you learn or decide something. Include why, if it is a decision."
        dont="Do not store passwords, ID numbers or card numbers. Memory is notes, not verified knowledge: to make something authoritative, put it through the knowledge bank."
      />
      <section className="card">
        <h2>Add to memory</h2>
        <ActionForm action={addMemory} submit="Save">
          <div className="field"><label htmlFor="mt">Type</label><select id="mt" name="type">{TYPES.slice(1).map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label htmlFor="tx">What should be remembered?</label><textarea id="tx" name="text" required minLength={3} maxLength={600} style={{ minHeight: 80 }} placeholder="One clear sentence." /></div>
        </ActionForm>
      </section>
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Memory log</h2>
          <div className="seg">{TYPES.map((t) => <Link key={t} href={t === 'all' ? '/app/memory' : `/app/memory?type=${t}`} aria-current={type === t}>{t}</Link>)}</div>
        </div>
        {rows?.length ? (
          <ul className="list">
            {rows.map((m) => (
              <li key={m.memory_id}><div className="l"><b>{m.text}</b><div className="muted small">{m.source ?? ''} · {fmt(m.created_at)}</div></div><div className="row">{m.example && <Pill>Example</Pill>}<Pill tone="info">{m.type}</Pill></div></li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nothing here yet. Add the first entry above.</p>
        )}
      </section>
    </div>
  )
}
