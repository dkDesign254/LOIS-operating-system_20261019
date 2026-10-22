import Link from 'next/link'
import { Icon, type IconName } from '@/components/icons'
import { LandingAssess } from '@/components/landing-assess'

const features: { icon: IconName; title: string; text: string }[] = [
  { icon: 'chat', title: 'Help that cites its sources', text: 'Ask in plain language. Answers come only from approved knowledge, with the evidence label shown. No match means no guess.' },
  { icon: 'book', title: 'Knowledge base', text: 'Paste or upload your documents. They are chunked, indexed and searchable straight away.' },
  { icon: 'shield', title: 'Knowledge bank', text: 'Nothing is trusted until a reviewer accepts it. Accepted entries are versioned and feed future answers.' },
  { icon: 'lifebuoy', title: 'A person when it matters', text: 'One click sends the question to a human. Their answer can be promoted to the bank so the next person gets it instantly.' },
  { icon: 'flask', title: 'Sandbox', text: 'Dry-run a scenario against your knowledge and see the decision brief. Nothing saved, nothing executed.' },
  { icon: 'plug', title: 'Plugs into everything', text: 'Versioned REST API, signed webhooks, n8n and Make ready. Additive changes only, so integrations keep working.' },
]

export default function Home() {
  return (
    <>
      <header className="topbar">
        <span className="brand">
          <i />
          LOIS
        </span>
        <Link className="btn" href="/login">
          Sign in
        </Link>
      </header>

      <section className="hero">
        <span className="chip">LOIS prepares and recommends. A person decides.</span>
        <h1 style={{ marginTop: '1rem' }}>Clarity for the people who decide.</h1>
        <p className="lead">
          A help assistant backed by a knowledge base you control and a knowledge bank that only learns from what a person has verified.
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link className="btn gold" href="/login?mode=signup">
            Get started free
          </Link>
          <a className="btn ghost" href="/api/v1/openapi.json">
            API reference
          </a>
        </div>
      </section>

      <section className="section">
        <h2 style={{ textAlign: 'center' }}>Find your starting point in three questions</h2>
        <LandingAssess />
      </section>

      <section className="section">
        <div className="grid two">
          {features.map((f) => (
            <div className="card feature" key={f.title}>
              <Icon name={f.icon} />
              <h3 style={{ marginTop: '0.5rem' }}>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="card navy">
          <div className="row">
            <Icon name="lock" style={{ width: 28, height: 28, color: 'var(--gold)' }} />
            <h2 style={{ margin: 0 }}>Built to be trusted</h2>
          </div>
          <p className="muted" style={{ marginTop: '0.75rem' }}>
            Every workspace is isolated by row-level security. Roles decide who can add, review and publish knowledge. API keys are stored as hashes. The assistant never sends, pays or publishes on anyone&apos;s behalf.
          </p>
        </div>
      </section>

      <footer className="foot">The Lucrebag · LOIS Knowledge Layer · Free tier workspaces include 50 questions a day. <a href="/privacy">Privacy</a></footer>
    </>
  )
}
