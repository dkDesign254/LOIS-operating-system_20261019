'use client'
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { CARDS, CARD_LABEL, sectionOf, type CardId, type RailLayout, type Suggestion } from '@/lib/rail'
import { saveRailLayout, touchSection, railVote } from '@/app/app/rail-actions'

/** The personal panel. Layout changes save for this person only. It counts visits, refreshes itself, and learns from votes. */
export function RailShell({ initial, slots }: { initial: RailLayout; slots: Record<CardId, ReactNode> }) {
  const [l, setL] = useState(initial)
  const [edit, setEdit] = useState(false)
  const [, start] = useTransition()
  const router = useRouter()
  const path = usePathname()
  const [stamp, setStamp] = useState('')
  const last = useRef('')

  const save = (next: RailLayout) => { setL(next); start(() => { void saveRailLayout(next) }) }

  useEffect(() => {
    const s = sectionOf(path)
    if (last.current === s) return
    last.current = s
    void touchSection(s)
  }, [path])

  useEffect(() => {
    const now = () => setStamp(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Nairobi' }))
    now()
    const tick = () => { if (document.visibilityState === 'visible') { router.refresh(); now() } }
    const t = setInterval(tick, 5 * 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', tick) }
  }, [router])

  const move = (c: CardId, d: -1 | 1) => {
    const o = [...l.order]; const i = o.indexOf(c); const j = i + d
    if (j < 0 || j >= o.length) return
    ;[o[i], o[j]] = [o[j], o[i]]
    save({ ...l, order: o })
  }
  const toggle = (k: 'hidden' | 'collapsed', c: CardId) => save({ ...l, [k]: l[k].includes(c) ? l[k].filter((x) => x !== c) : [...l[k], c] })

  if (!l.open) {
    return <button type="button" className="rail-reopen btn ghost small" onClick={() => save({ ...l, open: true })}>Show my panel</button>
  }
  return (
    <aside className="rail" aria-label="My panel">
      <div className="rail-head">
        <span className="small muted mono">My panel{stamp ? ` · ${stamp}` : ''}</span>
        <button type="button" className="link small" aria-expanded={edit} onClick={() => setEdit(!edit)}>{edit ? 'Done' : 'Customise'}</button>
      </div>
      {edit && (
        <section className="rail-card" aria-label="Customise my panel">
          <ul className="plainlist">
            {l.order.map((c, i) => (
              <li key={c} className="row" style={{ gap: '0.4rem', padding: '0.3rem 0' }}>
                <label className="grow"><input type="checkbox" checked={!l.hidden.includes(c)} onChange={() => toggle('hidden', c)} /> {CARD_LABEL[c]}</label>
                <button type="button" className="link small" aria-label={`Move ${CARD_LABEL[c]} up`} disabled={i === 0} onClick={() => move(c, -1)}>↑</button>
                <button type="button" className="link small" aria-label={`Move ${CARD_LABEL[c]} down`} disabled={i === l.order.length - 1} onClick={() => move(c, 1)}>↓</button>
              </li>
            ))}
          </ul>
          <label className="small"><input type="checkbox" checked={l.wide} onChange={() => save({ ...l, wide: !l.wide })} /> Wider panel</label>
          <p className="row" style={{ gap: '1rem', margin: '0.5rem 0 0' }}>
            <button type="button" className="link small" onClick={() => save({ ...l, open: false })}>Hide panel</button>
            <button type="button" className="link small" onClick={() => save({ order: [...CARDS], hidden: [], collapsed: [], wide: false, open: true })}>Reset</button>
          </p>
          <p className="muted small">Saved for you only. The panel notices what you open and what you mark &quot;not useful&quot;, and adjusts its suggestions. It does not use AI and shares nothing.</p>
        </section>
      )}
      {l.order.filter((c) => !l.hidden.includes(c)).map((c) => (
        <section key={c} className="rail-card" aria-label={CARD_LABEL[c]}>
          <div className="rail-head">
            <p className="marker mono" style={{ margin: 0 }}>§ {CARD_LABEL[c].toUpperCase()}</p>
            <button type="button" className="link small" aria-expanded={!l.collapsed.includes(c)} aria-label={`${l.collapsed.includes(c) ? 'Expand' : 'Collapse'} ${CARD_LABEL[c]}`} onClick={() => toggle('collapsed', c)}>{l.collapsed.includes(c) ? '＋' : '－'}</button>
          </div>
          {!l.collapsed.includes(c) && slots[c]}
        </section>
      ))}
    </aside>
  )
}

export function ForYou({ items }: { items: Suggestion[] }) {
  const [gone, setGone] = useState<string[]>([])
  const shown = items.filter((s) => !gone.includes(s.id))
  if (!shown.length) return <p className="muted small">Nothing needs you right now. As you use LOIS, suggestions here get more personal.</p>
  return (
    <ul className="plainlist">
      {shown.map((s) => (
        <li key={s.id} style={{ padding: '0.5rem 0' }}>
          <Link href={s.href} onClick={() => { void railVote(s.id, s.kind, 'up') }}>{s.text}</Link>
          <br /><span className="muted small">{s.why}</span>{' '}
          <button type="button" className="link small" onClick={() => { setGone([...gone, s.id]); void railVote(s.id, s.kind, 'down') }}>Not useful</button>
        </li>
      ))}
    </ul>
  )
}
