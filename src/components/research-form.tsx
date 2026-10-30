'use client'
import { useActionState } from 'react'
import { runResearch, proposeResearch, type ResearchState } from '@/app/app/research/actions'
import { SubmitButton } from './submit-button'

export function ResearchForm({ enabled }: { enabled: boolean }) {
  const [s, act] = useActionState<ResearchState, FormData>(runResearch, null)
  return (
    <div className="stack">
      <form action={act} className="card">
        <label htmlFor="rq">What do you want to find out?</label>
        <textarea id="rq" name="q" rows={3} maxLength={1000} required placeholder="For example: what are the current rules for registering as a data controller in Kenya?" defaultValue={s?.q} />
        <div className="row" style={{ marginTop: '0.6rem' }}><SubmitButton className="btn" disabled={!enabled} pendingText="Searching the web…">Research</SubmitButton></div>
        {!enabled && <p className="muted small">Not connected yet: add GOOGLE_API_KEY in Vercel (free) to switch this on.</p>}
      </form>
      <div aria-live="polite">
        {s?.error && <p className="err" role="alert">{s.error}</p>}
        {s?.r && (
          <article className="card">
            <h2 className="mono">Findings</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{s.r.text}</p>
            <h3 className="mono small">Sources</h3>
            {s.r.sources.length ? <ul className="plainlist">{s.r.sources.map((x) => <li key={x.url}><a href={x.url} target="_blank" rel="noopener noreferrer">{x.title}<span className="sr-only"> (opens in a new tab)</span></a></li>)}</ul> : <p className="callout small">The model gave no sources for this answer. Treat it as unverified.</p>}
            {s.knowledgeHits && s.knowledgeHits.length > 0 && <p className="small">Your accepted knowledge also covers: {s.knowledgeHits.map((h) => h.title).join('; ')}.</p>}
            <p className="muted small">Web findings are claims, not facts LOIS holds. Check the sources before you decide. {s.r.model}, {Math.round(s.r.ms / 100) / 10}s.</p>
            <form action={proposeResearch} className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <input type="hidden" name="title" value={s.q?.slice(0, 200) ?? ''} />
              <input type="hidden" name="content" value={s.r.text} />
              <input type="hidden" name="sources" value={JSON.stringify(s.r.sources)} />
              <SubmitButton className="btn ghost small" pendingText="Sending…">Propose to the Knowledge bank</SubmitButton>
              <span className="muted small">A reviewer sees it with these sources before it is used.</span>
            </form>
          </article>
        )}
      </div>
    </div>
  )
}
