import Link from 'next/link'
import { Icon } from '@/components/icons'
import { LandingAssess } from '@/components/landing-assess'
import { WireGlobe } from '@/components/wire-globe'
import { WireArt } from '@/components/wire-art'
import { Reveal } from '@/components/reveal'

const rows = [
  { title: 'Help that cites its sources', text: 'Ask in plain language. Answers come only from approved knowledge, with the evidence label shown. No match means no guess.', tag: 'CITED', icon: 'chat' as const },
  { title: 'Knowledge base', text: 'Paste or upload your documents. They are chunked, indexed and searchable straight away.', tag: 'YOURS', icon: 'book' as const },
  { title: 'Knowledge bank', text: 'Nothing is trusted until a reviewer accepts it. Accepted entries are versioned and feed future answers.', tag: 'REVIEWED', icon: 'shield' as const },
  { title: 'A person when it matters', text: 'One click sends the question to a human. Their answer can be promoted to the bank so the next person gets it instantly.', tag: 'HUMAN', icon: 'lifebuoy' as const },
  { title: 'AI Studio and sandbox', text: 'One place for every model. Dry-run a scenario, compare answers side by side, chain a plan into a draft and a check. Nothing is executed.', tag: '25-DAY TRIAL', icon: 'flask' as const },
  { title: 'Plugs into everything', text: 'Versioned REST API, signed webhooks, n8n and Make ready. Additive changes only, so integrations keep working.', tag: 'API', icon: 'plug' as const },
]

const modes = [
  { name: 'Auto', text: 'LOIS reads your task, picks the model that suits it best, and hands off to the next one if the first fails.' },
  { name: 'Compare', text: 'Ask up to three models at once and read the answers side by side before you choose.' },
  { name: 'Chain', text: 'One plans, one drafts, one checks. Each step sees what came before, so context is never lost.' },
]

export default function Home() {
  return (
    <>
      <header className="topbar sticky">
        <Link href="/" className="brand mono">
          LOIS<i />
        </Link>
        <nav className="topnav mono" aria-label="Main">
          <a href="#what">What it does</a>
          <a href="#studio">AI Studio</a>
          <a href="#trust">Trust</a>
          <Link href="/resources">Guides</Link>
          <Link href="/login">Sign in</Link>
          <Link className="btn small" href="/login?mode=signup">
            Get started free
          </Link>
        </nav>
      </header>

      <section className="hero2 gridbg" id="main">
        <div className="hero2-copy">
          <span className="eyebrow mono">LOIS prepares and recommends. A person decides.</span>
          <h1 className="display mono">
            Welcome to LOIS<span className="cursor" aria-hidden="true" />
          </h1>
          <p className="lead2">Clarity for the people who decide. One assistant, every model, and a knowledge bank that only learns from what a person has verified.</p>
          <div className="row">
            <Link className="btn" href="/login?mode=signup">
              Get started free
            </Link>
            <a className="btn ghost" href="#start">
              Find my starting point
            </a>
          </div>
        </div>
        <div className="hero2-art">
          <WireGlobe className="globe" />
        </div>
        <a className="enter mono" href="#start" aria-label="Enter: scroll to the start">
          Enter
          <span aria-hidden="true">↓</span>
        </a>
      </section>

      <section className="sect" id="start">
        <Reveal>
          <p className="marker mono">§ 01 · START HERE</p>
          <h2 className="h-mono">Find your starting point in three questions</h2>
          <LandingAssess />
        </Reveal>
      </section>

      <section className="sect" id="what">
        <Reveal>
          <p className="marker mono">§ 02 · WHAT YOU GET</p>
          <h2 className="h-mono">Everything a decision needs, in one place</h2>
          <ul className="rows">
            {rows.map((r) => (
              <li key={r.title}>
                <Icon name={r.icon} />
                <div className="r-main">
                  <h3 className="mono">{r.title}</h3>
                  <p className="muted">{r.text}</p>
                </div>
                <span className="tag mono">{r.tag}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className="sect" id="studio">
        <Reveal>
          <p className="marker mono">§ 03 · ONE POINT, EVERY MODEL</p>
          <div className="split">
            <div>
              <h2 className="h-mono">The best model for each job, without the juggling</h2>
              <p className="muted">
                Instead of opening one tool after another and repeating yourself, you write once. LOIS carries your context, routes each task to the model best suited to it, and shows you which one answered and why.
              </p>
              <div className="modes">
                {modes.map((m) => (
                  <div key={m.name} className="mode">
                    <b className="mono">{m.name}</b>
                    <p className="muted small">{m.text}</p>
                  </div>
                ))}
              </div>
              <p>
                <Link className="btn" href="/login?mode=signup">
                  Try it free for 25 days
                </Link>
              </p>
            </div>
            <div className="art-col">
              <WireArt kind="rings" size={300} />
            </div>
          </div>
        </Reveal>
      </section>

      <section className="sect" id="trust">
        <Reveal>
          <p className="marker mono">§ 04 · BUILT TO BE TRUSTED</p>
          <div className="split rev">
            <div className="art-col">
              <WireArt kind="mesh" size={260} />
            </div>
            <div>
              <h2 className="h-mono">You decide. LOIS prepares.</h2>
              <ul className="ticks">
                <li>Every workspace is isolated by row-level security.</li>
                <li>Roles and individual privileges decide who can add, review and publish knowledge.</li>
                <li>You can delegate a question to a qualified person, or keep it to yourself, one question at a time.</li>
                <li>The assistant never sends, pays or publishes on anyone&apos;s behalf.</li>
                <li>Export or delete your data from Privacy at any time.</li>
              </ul>
              <p>
                <Link className="btn ghost" href="/privacy">
                  Read the privacy notice
                </Link>
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="band">
        <div className="sect">
          <h2 className="h-mono">Start with a question. Keep the decision.</h2>
          <p className="muted">Free workspaces include 50 questions a day. No card needed.</p>
          <Link className="btn" href="/login?mode=signup">
            Create your free account
          </Link>
        </div>
      </section>

      <footer className="foot">
        The Lucrebag · LOIS Knowledge Layer · <Link href="/resources">Guides</Link> · <Link href="/privacy">Privacy</Link>
      </footer>
    </>
  )
}
