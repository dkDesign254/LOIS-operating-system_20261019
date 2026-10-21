import Link from 'next/link'
import { requireWorkspace } from '@/lib/session'
import { Icon, type IconName } from '@/components/icons'
import { Composer } from '@/components/forms'
import { askAction, escalateAction, feedbackAction } from './actions'
import type { Citation } from '@/lib/ask'

export const metadata = { title: 'Ask LOIS' }

const STARTERS: { mode: string; icon: IconName; title: string; text: string; q: string }[] = [
  { mode: 'untangle', icon: 'untangle', title: 'Untangle', text: 'Something is stuck and the cause is unclear.', q: 'We keep missing deadlines and I am not sure why. What does our process say about how work is handed over?' },
  { mode: 'decide', icon: 'decide', title: 'Decide', text: 'A quick fix or the proper fix?', q: 'What is our guidance on choosing between a quick fix and a proper fix?' },
  { mode: 'compare', icon: 'compare', title: 'Compare', text: 'Weigh options against what we know.', q: 'Compare our standard options for onboarding a new client.' },
  { mode: 'learn', icon: 'learn', title: 'Learn', text: 'Walk me through it, step by step.', q: 'Walk me through how we handle a new support request, step by step.' },
]

const ERRORS: Record<string, string> = {
  quota: "You've reached today's question limit for this workspace. It resets tomorrow.",
  save: 'Could not save the conversation. Please try again.',
  search: 'Search is unavailable right now. Please try again in a moment.',
}

export default async function Ask({ searchParams }: { searchParams: Promise<{ c?: string; q?: string; mode?: string; error?: string; thanks?: string }> }) {
  const sp = await searchParams
  const ctx = await requireWorkspace()

  const { data: convs } = await ctx.sb
    .from('lois_conversations')
    .select('conversation_id, title, mode')
    .eq('tenant_id', ctx.ws.tenant_id)
    .order('updated_at', { ascending: false })
    .limit(30)

  type Msg = { message_id: string; role: string; content: string; citations: Citation[] | null; confidence: number | null; answer_mode: string | null }
  let messages: Msg[] = []
  if (sp.c) {
    const { data } = await ctx.sb
      .from('lois_messages')
      .select('message_id, role, content, citations, confidence, answer_mode')
      .eq('conversation_id', sp.c)
      .order('created_at', { ascending: true })
    messages = (data ?? []) as Msg[]
  }
  const lastUser = [...messages].reverse().find((m) => m.role === 'user')

  return (
    <div className="chat">
      <aside>
        <Link className="btn ghost small" href="/app" style={{ marginBottom: '0.75rem' }}>
          + New chat
        </Link>
        <div className="convs" aria-label="Recent chats">
          {(convs ?? []).map((c) => (
            <Link key={c.conversation_id} href={`/app?c=${c.conversation_id}`} aria-current={sp.c === c.conversation_id}>
              {c.title}
            </Link>
          ))}
          {!convs?.length && <span className="muted small">No chats yet.</span>}
        </div>
      </aside>

      <section className="stack" style={{ minWidth: 0 }}>
        {sp.error && <div className="banner">{ERRORS[sp.error] ?? 'Something went wrong.'}</div>}
        {sp.thanks && <div className="banner">Thanks. Your feedback helps reviewers improve the knowledge bank.</div>}

        {!sp.c && (
          <>
            <div>
              <h1>What are you trying to solve?</h1>
              <p className="muted">
                Answers come only from {ctx.ws.name}&apos;s approved knowledge, with sources and evidence labels. If it isn&apos;t covered, LOIS says so and can bring in a person.
              </p>
            </div>
            <div className="starters">
              {STARTERS.map((s) => (
                <Link key={s.mode} className="starter" href={`/app?mode=${s.mode}&q=${encodeURIComponent(s.q)}`}>
                  <Icon name={s.icon} />
                  <b>{s.title}</b>
                  <span className="muted small">{s.text}</span>
                </Link>
              ))}
            </div>
          </>
        )}

        {messages.map((m) => (
          <div key={m.message_id}>
            <div className={`msg ${m.role}`}>
              {m.content}
              {m.role === 'assistant' && m.citations && m.citations.length > 0 && (
                <div className="cites">
                  <b>Sources</b>
                  {m.citations.map((c) => (
                    <div key={c.n} className="row" style={{ gap: 6 }}>
                      <span>[{c.n}]</span>
                      <span>{c.title}</span>
                      <span className={`chip ${c.label}`}>{c.label}</span>
                      {c.kind === 'bank' && <span className="chip">bank{c.version ? ` v${c.version}` : ''}</span>}
                    </div>
                  ))}
                  {m.confidence != null && <span className="muted">Indicative confidence {Math.round(m.confidence * 100)}%. It reflects retrieval strength, not accuracy.</span>}
                </div>
              )}
            </div>
            {m.role === 'assistant' && (
              <div className="row" style={{ marginTop: '0.4rem' }}>
                <form action={feedbackAction} className="row" style={{ gap: 6 }}>
                  <input type="hidden" name="message" value={m.message_id} />
                  <input type="hidden" name="conversation" value={sp.c} />
                  <button className="btn ghost small" name="rating" value="1" aria-label="Helpful">
                    Helpful
                  </button>
                  <button className="btn ghost small" name="rating" value="-1" aria-label="Not helpful">
                    Not helpful
                  </button>
                </form>
                <form action={escalateAction}>
                  <input type="hidden" name="message" value={m.message_id} />
                  <input type="hidden" name="conversation" value={sp.c} />
                  <input type="hidden" name="question" value={lastUser?.content ?? ''} />
                  <button className="btn ghost small">{m.answer_mode === 'no_match' ? 'Ask a person' : 'Ask a person to check'}</button>
                </form>
              </div>
            )}
          </div>
        ))}

        <Composer
          action={askAction}
          hidden={{ conversation: sp.c ?? '', mode: sp.mode ?? 'ask' }}
          defaultValue={sp.q}
          placeholder="Describe the problem, decision or question…"
        />
      </section>
    </div>
  )
}
