import Link from 'next/link'
import { BriefBuilder } from '@/components/brief-builder'

export const metadata = {
  title: 'Try LOIS without an account',
  description: 'Turn a rough decision into a one-page brief: what is clear, what is missing, who should approve. Free, no account.',
}

const perks = [
  { t: 'Ask LOIS', d: 'Answers from your own approved knowledge, with sources.' },
  { t: 'Daily briefing', d: 'Each weekday morning: what needs you, with drafts waiting.' },
  { t: 'AI Studio', d: 'Every major model in one place, with your context carried over.' },
  { t: 'Agent readiness', d: 'Check how well AI tools can find and read your website.' },
]

export default function Try() {
  return (
    <>
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
      <footer className="foot">The Lucrebag · LOIS Knowledge Layer · <Link href="/privacy">Privacy</Link></footer>
    </>
  )
}
