'use server'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'
import { retrieve } from '@/lib/ask'
import { getTrial } from '@/lib/trial'
import { webResearch, researchEnabled, type Research } from '@/lib/research'

export type ResearchState = { error?: string; q?: string; r?: Research; knowledgeHits?: { id: string; title: string }[]; proposed?: boolean } | null
const CAP = 15

export async function runResearch(_: ResearchState, fd: FormData): Promise<ResearchState> {
  const ctx = await requireWorkspace()
  const q = String(fd.get('q') ?? '').trim().slice(0, 1000)
  if (q.length < 5) return { error: 'Type your question first.' }
  if (!researchEnabled()) return { error: 'Web research needs a free Gemini key. An owner adds GOOGLE_API_KEY in Vercel (free at aistudio.google.com) and redeploys.' }
  const trial = await getTrial(ctx.sb, ctx.isInternal)
  if (trial?.ended) return { error: 'Your 25-day sandbox trial has ended.' }
  const { data: used } = await ctx.sb.rpc('lois_ai_used_today')
  if (typeof used === 'number' && used >= (ctx.isInternal ? 200 : 40)) return { error: "You have used today's AI requests. The count resets at midnight Nairobi time." }
  const { count } = await ctx.sb.from('lois_ai_turns').select('turn_id', { count: 'exact', head: true }).eq('user_id', ctx.user.id).eq('mode', 'research').gte('created_at', new Date(Date.now() - 864e5).toISOString())
  if ((count ?? 0) >= CAP) return { error: `You have used today's ${CAP} web research requests.` }

  const hits = await retrieve(ctx.sb, ctx.ws.tenant_id, q, 3).catch(() => [])
  const knowledge = hits.map((h) => `- ${h.title}: ${h.snippet.replace(/<\/?b>/g, '')}`).join('\n')
  try {
    const r = await webResearch(q, knowledge)
    const { data: s } = await ctx.sb.from('lois_ai_sessions').insert({ tenant_id: ctx.ws.tenant_id, title: 'Research: ' + q.slice(0, 70) }).select('session_id').single()
    if (s) await ctx.sb.from('lois_ai_turns').insert([
      { session_id: s.session_id, tenant_id: ctx.ws.tenant_id, role: 'user', mode: 'research', task: 'general', content: q },
      { session_id: s.session_id, tenant_id: ctx.ws.tenant_id, role: 'assistant', mode: 'research', task: 'general', provider: 'google', model: r.model, step: 'answer', reason: 'Web research with Google Search', content: r.text, ok: true, latency_ms: r.ms },
    ])
    return { q, r, knowledgeHits: hits.map((h) => ({ id: h.id, title: h.title })) }
  } catch (e) {
    const code = e instanceof Error ? e.message : ''
    return { error: code === '429' ? 'The free Gemini quota is used up for now. Try again later.' : 'Web research failed (' + (code || 'unknown') + '). Try again in a moment.' }
  }
}

/** Proposes the finding to the Knowledge bank. It is labelled "reported", carries its web sources, and waits for a reviewer. */
export async function proposeResearch(fd: FormData) {
  const ctx = await requireWorkspace()
  const title = String(fd.get('title') ?? '').trim().slice(0, 200)
  const content = String(fd.get('content') ?? '').trim().slice(0, 8000)
  let sources: { title: string; url: string }[] = []
  try { sources = (JSON.parse(String(fd.get('sources') ?? '[]')) as { title: string; url: string }[]).filter((s) => /^https:\/\//.test(s.url)).slice(0, 8) } catch {}
  if (title.length < 5 || content.length < 20) return
  await ctx.sb.from('lois_knowledge_items').insert({
    tenant_id: ctx.ws.tenant_id, title, content, domain: 'web_research', evidence_label: 'reported', status: 'pending_review', created_by: ctx.user.id,
    metadata: { via: 'web_research', web_sources: sources, note: 'Found on the web by LOIS; not yet verified by a person.' },
  })
  revalidatePath('/app/bank')
}
