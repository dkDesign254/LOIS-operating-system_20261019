'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'
import { retrieve } from '@/lib/ask'
import { getTrial } from '@/lib/trial'
import { buildContext, classifyTask, enabledProviders, nextSummary, runAuto, runChain, runCompare, TASKS, type Step, type Task, type Turn } from '@/lib/models'

export type StudioState = { error?: string; sessionId?: string } | null
const DAILY_EXTERNAL = 40
const DAILY_INTERNAL = 200

const str = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? '').trim().slice(0, max)

export async function studioRun(_: StudioState, fd: FormData): Promise<StudioState> {
  const ctx = await requireWorkspace()
  const q = str(fd, 'q', 8000)
  if (q.length < 3) return { error: 'Type your request first.' }
  const mode = (['auto', 'compare', 'chain'] as const).find((m) => m === fd.get('mode')) ?? 'auto'
  const forced = (Object.keys(TASKS) as Task[]).find((t) => t === fd.get('task'))

  const trial = await getTrial(ctx.sb, ctx.isInternal)
  if (trial?.ended) return { error: 'Your 25-day sandbox trial has ended. Your sessions are still yours. Ask the LOIS team to extend it.' }
  const { data: used } = await ctx.sb.rpc('lois_ai_used_today')
  const cap = ctx.isInternal ? DAILY_INTERNAL : DAILY_EXTERNAL
  if (typeof used === 'number' && used >= cap) return { error: `You have used today's ${cap} Studio requests. The count resets at midnight Nairobi time.` }

  let sid = str(fd, 'session', 64)
  let summary = ''
  let history: Turn[] = []
  if (sid) {
    const { data: s } = await ctx.sb.from('lois_ai_sessions').select('session_id, summary').eq('session_id', sid).maybeSingle()
    if (!s) sid = ''
    else {
      summary = s.summary
      const { data: ts } = await ctx.sb.from('lois_ai_turns').select('role, content, model').eq('session_id', sid).order('created_at', { ascending: false }).limit(8)
      history = (ts ?? []).reverse() as Turn[]
    }
  }
  if (!sid) {
    const { data: s, error } = await ctx.sb.from('lois_ai_sessions').insert({ tenant_id: ctx.ws.tenant_id, title: q.slice(0, 80) }).select('session_id').single()
    if (error || !s) return { error: 'Could not start a session. Please try again.' }
    sid = s.session_id
  }

  const task = forced ?? classifyTask(q)
  const hits = await retrieve(ctx.sb, ctx.ws.tenant_id, q, 4).catch(() => [])
  const knowledge = hits.map((h) => `${h.document_title ?? h.title} [${h.evidence_label}]: ${h.snippet.replace(/<\/?b>/g, '')}`).join('\n')

  await ctx.sb.from('lois_ai_turns').insert({ session_id: sid, tenant_id: ctx.ws.tenant_id, role: 'user', mode, task, content: q })

  let steps: Step[] = []
  if (!enabledProviders().length) {
    const text = hits.length
      ? `No AI model is connected yet, so here is what your approved knowledge says:\n\n${knowledge}`
      : 'No AI model is connected yet, and nothing in your approved knowledge matches. An owner can connect Gemini, Groq or OpenRouter (all have free tiers) in Vercel settings.'
    await ctx.sb.from('lois_ai_turns').insert({ session_id: sid, tenant_id: ctx.ws.tenant_id, role: 'assistant', mode, task, provider: 'knowledge', model: 'extractive', reason: 'No model keys set', step: 'answer', content: text })
  } else {
    const context = buildContext({ summary, knowledge, history })
    steps = mode === 'compare' ? await runCompare(task, context, q) : mode === 'chain' ? await runChain(context, q) : await runAuto(task, context, q)
    const rows = steps.map((s) => ({
      session_id: sid, tenant_id: ctx.ws.tenant_id, role: 'assistant', mode, task: s.task,
      provider: s.reply?.provider ?? null, model: s.reply?.model ?? null, reason: s.reason, step: s.step,
      content: s.reply?.text ?? s.reason, ok: Boolean(s.reply), latency_ms: s.reply?.ms ?? null,
    }))
    if (rows.length) await ctx.sb.from('lois_ai_turns').insert(rows)
    const best = [...steps].reverse().find((s) => s.reply)
    if (best?.reply) summary = nextSummary(summary, q, best.reply.model, best.reply.text)
    else if (!steps.length) return { error: 'No model answered. Try again in a moment.' }
  }
  await ctx.sb.from('lois_ai_sessions').update({ summary, updated_at: new Date().toISOString() }).eq('session_id', sid)
  revalidatePath('/app/sandbox/studio')
  redirect(`/app/sandbox/studio?s=${sid}`)
}

export async function deleteSession(fd: FormData) {
  const ctx = await requireWorkspace()
  await ctx.sb.from('lois_ai_sessions').delete().eq('session_id', str(fd, 'id', 64))
  redirect('/app/sandbox/studio')
}
