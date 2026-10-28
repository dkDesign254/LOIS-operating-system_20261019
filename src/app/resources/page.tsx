import Link from 'next/link'
import { GUIDES } from '@/lib/guides'

export const metadata = { title: 'Resources', description: 'Free practical guides on being found by AI agents, working with AI models, turning documents into trusted knowledge and keeping a person in charge of decisions.', alternates: { canonical: '/resources' } }

export default function Resources() {
  const topics = [...new Set(GUIDES.map((g) => g.topic))]
  return (
    <>
      <header className="topbar sticky">
        <Link href="/" className="brand mono">LOIS<i /></Link>
        <nav className="topnav mono" aria-label="Main"><Link href="/login">Sign in</Link><Link className="btn small" href="/login?mode=signup">Get started free</Link></nav>
      </header>
      <main id="main" className="sect">
        <p className="marker mono">RESOURCES</p>
        <h1 className="h-mono">Free guides, written to be used</h1>
        <p className="muted" style={{ maxWidth: '40em' }}>Short, practical and honest about what they cannot promise. No sign-up needed.</p>
        {topics.map((t) => (
          <section key={t} style={{ marginTop: '2rem' }}>
            <h2 className="mono small" style={{ letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--blue-2)' }}>{t}</h2>
            <ul className="rows plain">
              {GUIDES.filter((g) => g.topic === t).map((g) => (
                <li key={g.slug}>
                  <div className="r-main"><h3 className="mono"><Link href={`/resources/${g.slug}`}>{g.title}</Link></h3><p className="muted">{g.summary}</p></div>
                  <span className="tag mono">{g.minutes} MIN</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
      <footer className="foot">The Lucrebag · LOIS Knowledge Layer · <Link href="/privacy">Privacy</Link> · <Link href="/privacy#contact">Contact</Link></footer>
    </>
  )
}
