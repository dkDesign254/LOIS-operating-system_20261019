'use client'
import { useActionState } from 'react'
import { guestSiteCheck, type CheckState } from '@/app/try/actions'
import { SubmitButton } from '@/components/submit-button'
import { MEASURES } from '@/lib/scan'

export function GuestSiteCheck() {
  const [s, act] = useActionState<CheckState, FormData>(guestSiteCheck, null)
  return (
    <section style={{ marginTop: '3rem' }} aria-labelledby="sc-h">
      <p className="marker mono">§ CHECK A WEBSITE · NO ACCOUNT</p>
      <h2 id="sc-h" className="h-mono" style={{ fontSize: '1.1rem' }}>Can AI tools find and read your website?</h2>
      <p className="muted">Enter an address. LOIS reads the public page and scores four things. Nothing is saved.</p>
      <form action={act} className="optrow" style={{ gap: '.5rem', flexWrap: 'wrap' }}>
        <label htmlFor="sc-url" className="sr-only">Website address</label>
        <input id="sc-url" name="url" type="text" inputMode="url" placeholder="example.com" required style={{ flex: '1 1 220px' }} />
        <SubmitButton className="btn" pendingText="Checking…">Check it</SubmitButton>
      </form>
      <div aria-live="polite">
        {s?.error && <p className="callout" role="alert">{s.error}</p>}
        {s?.scores && (
          <div className="callout" style={{ marginTop: '1rem' }}>
            <h3 className="mono">{s.host}</h3>
            <ul className="plainlist">
              {(Object.keys(MEASURES) as (keyof typeof MEASURES)[]).map((k) => (
                <li key={k}><b>{MEASURES[k].label}</b>: {s.scores![k]} / 100 <span className="muted small">{MEASURES[k].text}</span></li>
              ))}
            </ul>
            {s.actions && s.actions.length > 0 && (
              <>
                <h4 className="mono">What to fix first</h4>
                <ol>{s.actions.map((a) => <li key={a.title}><b>{a.title}</b> <span className="muted">{a.why}</span></li>)}</ol>
              </>
            )}
            <p className="small">Want the full list, saved history and step-by-step fixes? <a href="/login?mode=signup">Continue with Google, free</a>.</p>
          </div>
        )}
      </div>
    </section>
  )
}
