import Link from 'next/link'
import { BriefBuilder } from '@/components/brief-builder'
import { SITE_URL } from '@/lib/site'

export const metadata = {
  title: 'Try LOIS without an account',
  alternates: { canonical: '/try' },
  description: 'Turn a rough decision into a one-page brief: what is clear, what is missing, who should approve. Free, no account.',
}

const perks = [
  { t: 'Ask LOIS', d: 'Answers from your own approved knowledge, with sources.' },
  { t: 'Daily briefing', d: 'Each weekday morning: what needs you, with drafts waiting.' },
  { t: 'AI Studio', d: 'Every major model in one place, with your context carried over.' },
  { t: 'Agent readiness', d: 'Check how well AI tools can find and read your website.' },
]

const ld = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'LOIS Decision Brief',
  url: `${SITE_URL}/try`,
  applicationCategory: 'BusinessApplication',
  description: 'Check whether a decision is ready: what is clear, what is missing, who should approve.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

const how = [
  { t: 'Say the decision', d: 'One line, one owner, one date.' },
  { t: 'Show the options', d: 'What each gains and what each risks.' },
  { t: 'Check the evidence', d: 'LOIS compares it to how much is at stake.' },
]

export default function Try() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <header className="topbar sticky">
        <Link href="/" className="brand mono">LOIS<i /></Link>
        <nav className="topnav mono" aria-label="Main">
          <Link href="/resources">Guides</Link>
          <Link href="/login">Sign in</Link>
          <Link className="btn small" href="/login?mode=signup">Create free account</Link>
        </nav>
      </header>
      <main id="main" className="sect" style={{ maxWidth: 820, margin: '0 auto' }}>
        <p className="marker mono">§ TRY IT · NO ACCOUNT NEEDED</p>
        <h1 className="h-mono">Know whether a decision is ready before you make it</h1>
        <p className="lead2">Type the decision, the options and what you know. LOIS tells you what is clear, what is missing, who should approve, and drafts the message to send. About two minutes. It stays in your browser.</p>
        <h2 className="h-mono" style={{ fontSize: '1.1rem' }}>How it works</h2>
        <ol className="steps">{how.map((h) => <li key={h.t}><b className="mono">{h.t}</b> <span className="muted">{h.d}</span></li>)}</ol>
        <BriefBuilder mode="guest" />
        <section style={{ marginTop: '3rem' }}>
          <p className="marker mono">§ AND THEN, IN YOUR WORKSPACE</p>
          <ul className="rows plain">
            {perks.map((p) => (
              <li key={p.t}><div className="r-main"><h3 className="mono">{p.t}</h3><p className="muted">{p.d}</p></div></li>
            ))}
          </ul>
        </section>
      </main>
      <footer className="foot">The Lucrebag · LOIS Knowledge Layer · <Link href="/privacy">Privacy</Link> · <Link href="/privacy#contact">Contact</Link></footer>
    </>
  )
}
