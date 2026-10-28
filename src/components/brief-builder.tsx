'use client'
import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { analyse, emptyBrief, parseBrief, EVIDENCE, type BriefInput } from '@/lib/brief'

const KEY = 'lois_guest_brief'

function Bar({ v }: { v: number }) {
  return (
    <div className="meter" role="img" aria-label={`${v} out of 100`}>
      <i style={{ width: `${v}%` }} />
    </div>
  )
}

export function BriefBuilder({ mode, save }: { mode: 'guest' | 'member'; save?: (payload: string) => Promise<{ error?: string; message?: string }> }) {
  const [b, setB] = useState<BriefInput>(emptyBrief())
  const [note, setNote] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [copied, setCopied] = useState(false)
  const [imported, setImported] = useState(false)
  const r = useMemo(() => analyse(b), [b])
  const started = b.decision.trim().length > 0

  // Guests keep their work in their own browser only. Nothing is sent anywhere until they create an account.
  useEffect(() => {
    try {
      const saved = parseBrief(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
      if (saved) {
        setB(saved)
        if (mode === 'member') setImported(true)
      }
    } catch {}
  }, [mode])
  useEffect(() => {
    if (mode !== 'guest') return
    try {
      localStorage.setItem(KEY, JSON.stringify(b))
    } catch {}
  }, [b, mode])

  const set = <K extends keyof BriefInput>(k: K, v: BriefInput[K]) => setB((p) => ({ ...p, [k]: v }))
  const setOpt = (i: number, k: 'name' | 'upside' | 'downside', v: string) => setB((p) => ({ ...p, options: p.options.map((o, j) => (j === i ? { ...o, [k]: v } : o)) }))

  function copy() {
    navigator.clipboard?.writeText(r.message).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }
  function saveMine() {
    if (!save) return
    start(async () => {
      const res = await save(JSON.stringify(b))
      setNote(res.error ?? res.message ?? null)
      if (!res.error) try { localStorage.removeItem(KEY) } catch {}
    })
  }

  return (
    <div className="stack">
      {imported && <p className="ok" role="status">We found the brief you started before you signed up. Check it and save it to your workspace.</p>}
      <div className="card stack">
        <div className="field">
          <label htmlFor="b-decision">The decision, in one line</label>
          <input id="b-decision" type="text" maxLength={200} value={b.decision} onChange={(e) => set('decision', e.target.value)} placeholder="e.g. Hire a freelance designer for Q1" />
        </div>
        <div className="grid two">
          <div className="field"><label htmlFor="b-decider">Who decides?</label><input id="b-decider" type="text" maxLength={80} value={b.decider} onChange={(e) => set('decider', e.target.value)} /></div>
          <div className="field"><label htmlFor="b-date">Decide by</label><input id="b-date" type="date" value={b.deadline} onChange={(e) => set('deadline', e.target.value)} /></div>
          <div className="field"><label htmlFor="b-stakes">Stakes</label>
            <select id="b-stakes" value={b.stakes} onChange={(e) => set('stakes', e.target.value as BriefInput['stakes'])}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
          <div className="field"><label htmlFor="b-rev">If it goes wrong</label>
            <select id="b-rev" value={b.reversibility} onChange={(e) => set('reversibility', e.target.value as BriefInput['reversibility'])}><option value="easy">Easy to undo</option><option value="hard">Hard to undo</option><option value="none">Cannot be undone</option></select></div>
        </div>
        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600 }}>The options</legend>
          {b.options.map((o, i) => (
            <div key={i} className="optrow">
              <input aria-label={`Option ${i + 1} name`} type="text" maxLength={80} placeholder={`Option ${i + 1}`} value={o.name} onChange={(e) => setOpt(i, 'name', e.target.value)} />
              <input aria-label={`Option ${i + 1} gain`} type="text" maxLength={400} placeholder="What it gains" value={o.upside} onChange={(e) => setOpt(i, 'upside', e.target.value)} />
              <input aria-label={`Option ${i + 1} cost`} type="text" maxLength={400} placeholder="What it costs or risks" value={o.downside} onChange={(e) => setOpt(i, 'downside', e.target.value)} />
            </div>
          ))}
          {b.options.length < 4 && <button type="button" className="btn ghost small" onClick={() => set('options', [...b.options, { name: '', upside: '', downside: '' }])}>Add an option</button>}
        </fieldset>
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend style={{ fontWeight: 600 }}>What evidence do you already have?</legend>
          <div className="checks">
            {EVIDENCE.map((e) => (
              <label key={e.key} className="row" style={{ fontWeight: 400 }}>
                <input type="checkbox" checked={b.evidence.includes(e.key)} onChange={(ev) => set('evidence', ev.target.checked ? [...b.evidence, e.key] : b.evidence.filter((k) => k !== e.key))} /> {e.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="b-unk">What don&apos;t you know yet? (one per line)</label>
          <textarea id="b-unk" rows={3} maxLength={1200} value={b.unknowns} onChange={(e) => set('unknowns', e.target.value)} />
        </div>
      </div>

      {started ? (
        <section className="card stack" aria-live="polite">
          <p className="marker mono">§ YOUR BRIEF</p>
          <h2 style={{ margin: 0 }}>{r.verdictText}</h2>
          <p className="muted small">Score {r.score} of 100. Worked out by plain rules from what you typed. Nothing is guessed or added.</p>
          <div className="stack">
            {r.measures.map((m) => (
              <div key={m.key}><div className="row" style={{ justifyContent: 'space-between' }}><b>{m.label}</b><span className="mono">{m.score}</span></div><Bar v={m.score} /><p className="muted small" style={{ margin: 0 }}>{m.why}</p></div>
            ))}
          </div>
          {r.gaps.length > 0 && <div><h3>Close these first</h3><ul>{r.gaps.map((g) => <li key={g}>{g}</li>)}</ul></div>}
          {r.questions.length > 0 && <div><h3>Questions to answer</h3><ul>{r.questions.map((g) => <li key={g}>{g}</li>)}</ul></div>}
          <div><h3>What would change the answer</h3><ul>{r.tripwires.map((g) => <li key={g}>{g}</li>)}</ul></div>
          <div><h3>Who should approve</h3><p>{r.approvers}</p></div>
          <div><h3>Next steps</h3><ol>{r.actions.map((g) => <li key={g}>{g}</li>)}</ol></div>
          <div><h3>A message you can send</h3><pre className="draft">{r.message}</pre>
            <div className="row"><button type="button" className="btn ghost small" onClick={copy}>{copied ? 'Copied' : 'Copy message'}</button></div></div>
          <p className="muted small">LOIS prepares this. A person decides. It does not send anything for you.</p>
          {mode === 'guest' ? (
            <div className="callout">
              <b>Keep this brief and get the rest of LOIS.</b>
              <p className="muted small" style={{ margin: '0.25rem 0 0.6rem' }}>It is saved in this browser only. Create a free account and it moves into your workspace, next to your knowledge base, AI Studio and daily briefing.</p>
              <Link className="btn" href="/login?mode=signup&next=/app/briefs">Save it free</Link>
            </div>
          ) : (
            <div className="row"><button type="button" className="btn" disabled={pending} onClick={saveMine}>{pending ? 'Saving…' : 'Save to my workspace'}</button>{note && <span role="status" className="muted small">{note}</span>}</div>
          )}
        </section>
      ) : (
        <p className="muted">Start with the decision. Your brief builds as you type.</p>
      )}
    </div>
  )
}
