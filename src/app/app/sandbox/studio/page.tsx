import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { StudioForm } from '@/components/studio-form'
import { getTrial } from '@/lib/trial'
import { providerStatus, TASKS } from '@/lib/models'
import { studioRun, deleteSession } from '../../studio-actions'

export const metadata = { title: 'AI Studio' }

type Turn = { turn_id: string; role: string; mode: string | null; task: string | null; provider: string | null; model: string | null; reason: string | null; step: string | null; content: string; ok: boolean; latency_ms: number | null }

export default async function Studio({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const ctx = await requireWorkspace()
  const sp = await searchParams
  const trial = await getTrial(ctx.sb, ctx.isInternal)
  const [{ data: sessions }, { data: turns }] = await Promise.all([
    ctx.sb.from('lois_ai_sessions').select('session_id, title, updated_at').order('updated_at', { ascending: false }).limit(20),
    sp.s ? ctx.sb.from('lois_ai_turns').select('turn_id, role, mode, task, provider, model, reason, step, content, ok, latency_ms').eq('session_id', sp.s).order('created_at') : Promise.resolve({ data: [] as Turn[] }),
  ])
  const providers = providerStatus()
  const connected = providers.filter((p) => p.on)

  return (
    <div className="stack">
      <div className="tabs">
        <Link href="/app/sandbox">Dry run and tools</Link>
        <Link href="/app/sandbox/studio" aria-current="page">AI Studio</Link>
      </div>
      <div>
        <h1>AI Studio</h1>
        <p className="muted">One place to use several AI models. LOIS chooses the best connected model for each job, hands work between them with the same session memory and your approved knowledge, and tells you which model answered and why. Nothing is executed.</p>
      </div>

      <div className="card soft">
        <h3>Models connected: {connected.length} of {providers.length}</h3>
        <div className="row" style={{ marginTop: '0.5rem' }}>
          {providers.map((p) => <span key={p.id} className={`pill ${p.on ? 'ok' : ''}`} title={p.on ? p.model : `Add ${p.env} in Vercel`}>{p.label}{p.free ? ' · free tier' : ''}: {p.on ? 'on' : 'off'}</span>)}
        </div>
        {!connected.length && <p className="muted small" style={{ marginTop: '0.75rem' }}>No models are connected, so Studio answers from your approved knowledge only. {ctx.isAdmin ? 'Add GOOGLE_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY (all have free tiers) in Vercel, then redeploy.' : 'An owner can connect models.'}</p>}
      </div>

      <div className="chat">
        <aside>
          <Link href="/app/sandbox/studio" className="btn ghost small">+ New session</Link>
          <div className="convs" style={{ marginTop: '0.75rem' }}>
            {(sessions ?? []).map((s) => <Link key={s.session_id} href={`/app/sandbox/studio?s=${s.session_id}`} aria-current={sp.s === s.session_id ? 'true' : undefined}>{s.title}</Link>)}
            {!sessions?.length && <p className="muted small">No sessions yet.</p>}
          </div>
        </aside>
        <section className="stack">
          {(turns as Turn[] | null)?.map((t) =>
            t.role === 'user' ? (
              <div key={t.turn_id} className="msg user">{t.content}</div>
            ) : (
              <div key={t.turn_id} className="reply">
                <div className="meta">
                  <b>{t.step && t.step !== 'answer' ? `${t.step} · ` : ''}{t.model ?? 'LOIS'}</b>
                  {t.task ? ` · ${TASKS[t.task as keyof typeof TASKS] ?? t.task}` : ''}{t.latency_ms ? ` · ${(t.latency_ms / 1000).toFixed(1)} s` : ''}
                  {t.reason ? <><br />{t.reason}</> : null}
                </div>
                {t.content}
              </div>
            ),
          )}
          <StudioForm action={studioRun} session={sp.s} tasks={TASKS} disabled={trial?.ended ? 'Your 25-day trial has ended. Ask the LOIS team to extend it.' : undefined} />
          {sp.s && (
            <form action={deleteSession}>
              <input type="hidden" name="id" value={sp.s} />
              <button className="btn ghost small">Delete this session</button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
