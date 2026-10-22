import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { Tour } from '@/components/control'
import { Guide } from '@/components/ui'
import { GLOSSARY, LEARN, type RoleKey } from '@/lib/learn'

export const metadata = { title: 'Learn LOIS' }

export default async function Learn({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const sp = await searchParams
  await requireWorkspace()
  const role = (Object.keys(LEARN).includes(sp.role ?? '') ? sp.role : 'manager') as RoleKey
  const r = LEARN[role]
  return (
    <div className="stack">
      <div>
        <h1>Learn LOIS</h1>
        <p className="muted">What the platform offers and how to work with it.</p>
      </div>
      <Guide what="An induction for any new manager, employee, test client or builder." doit="Pick your role. Follow the three steps. Tick the tour as you go." dont="Do not skip the do and avoid lists. They are the safety rules." open />
      <section className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>I am a…</h2>
          <div className="seg">{(Object.keys(LEARN) as RoleKey[]).map((k) => <Link key={k} href={`/app/learn?role=${k}`} aria-current={role === k}>{LEARN[k].title}</Link>)}</div>
        </div>
        <p><b>What LOIS gives you.</b> {r.offer}</p>
        <b>Your first three steps</b>
        <ol className="tight">{r.steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <div className="grid two" style={{ marginTop: 12 }}>
          <div><b>Do</b><ul className="tight do">{r.good.map((s) => <li key={s}>{s}</li>)}</ul></div>
          <div><b>Avoid</b><ul className="tight dont">{r.bad.map((s) => <li key={s}>{s}</li>)}</ul></div>
        </div>
      </section>
      <Tour />
      <section className="card">
        <h2>What LOIS can do</h2>
        <div className="grid two">
          {[['Monitor', 'Shows what is working, failing or unknown.'], ['Decide', 'Holds requests for a person and checks evidence first.'], ['Remember', 'Keeps facts, decisions and lessons so nothing is lost.'], ['Brief', 'Summarises the week and gives a reasoned recommendation.'], ['Answer', 'Replies only from approved knowledge, with citations, and asks a person when it cannot.'], ['Learn', 'Turns reviewed answers and lessons into the knowledge bank.']].map(([a, b]) => <div key={a}><b>{a}</b><p className="muted">{b}</p></div>)}
        </div>
      </section>
      <section className="card">
        <h2>Plain-English glossary</h2>
        <ul className="list">{GLOSSARY.map(([a, b]) => <li key={a}><b style={{ minWidth: 150 }}>{a}</b><span className="l muted">{b}</span></li>)}</ul>
      </section>
    </div>
  )
}
