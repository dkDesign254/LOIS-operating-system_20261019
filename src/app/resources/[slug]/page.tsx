import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GUIDES, getGuide } from '@/lib/guides'

export function generateStaticParams() { return GUIDES.map((g) => ({ slug: g.slug })) }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug)
  return g ? { title: g.title, description: g.summary, robots: { index: true, follow: true } } : {}
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const g = getGuide((await params).slug)
  if (!g) notFound()
  const ld = { '@context': 'https://schema.org', '@type': 'HowTo', name: g.title, description: g.summary, step: g.steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.h, text: s.p })) }
  return (
    <>
      <header className="topbar sticky">
        <Link href="/" className="brand mono">LOIS<i /></Link>
        <nav className="topnav mono" aria-label="Main"><Link href="/resources">All guides</Link><Link className="btn small" href="/login?mode=signup">Get started free</Link></nav>
      </header>
      <main id="main" className="sect" style={{ maxWidth: 760 }}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
        <p className="marker mono">{g.topic.toUpperCase()} · {g.minutes} MIN READ</p>
        <h1 className="h-mono">{g.title}</h1>
        <p className="lead2">{g.summary}</p>
        <ol className="steps">
          {g.steps.map((s) => (<li key={s.h}><h2 className="mono">{s.h}</h2><p>{s.p}</p></li>))}
        </ol>
        {g.example && (<><h2 className="mono small">{g.example.label}</h2><pre>{g.example.code}</pre></>)}
        {g.inLois && (<p><Link className="btn" href={g.inLois.href}>{g.inLois.label}</Link></p>)}
        <p className="small muted">Guidance only, not legal or technical advice for your specific situation. Conventions such as llms.txt are proposals, and AI systems differ in what they read.</p>
      </main>
      <footer className="foot">The Lucrebag · LOIS Knowledge Layer · <Link href="/resources">All guides</Link> · <Link href="/privacy">Privacy</Link></footer>
    </>
  )
}
