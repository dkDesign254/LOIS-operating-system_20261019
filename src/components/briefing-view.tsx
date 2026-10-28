import Link from 'next/link'
import type { Briefing } from '@/lib/briefing'
import { SpeakButton } from './speak-button'

export function BriefingView({ b, compact }: { b: Briefing; compact?: boolean }) {
  return (
    <div className="stack">
      <p style={{ margin: 0 }}><b>{b.greeting}</b></p>
      <ul className="plainlist">
        {(compact ? b.items.slice(0, 3) : b.items).map((i) => (
          <li key={i.text} style={{ padding: '0.45rem 0' }}>
            <Link href={i.href} style={{ textDecoration: 'none', color: 'inherit' }}>{i.text}</Link>
            <br /><span className="muted small mono">{i.source}</span>
          </li>
        ))}
      </ul>
      {!compact && b.actions.length > 0 && <div><h3>Suggested next steps</h3><ol>{b.actions.map((a) => <li key={a}>{a}</li>)}</ol></div>}
      <SpeakButton text={b.spoken} />
    </div>
  )
}
