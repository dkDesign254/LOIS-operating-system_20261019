'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireInternal } from '@/lib/session'
import { generate, llmEnabled, data, NO_LLM } from '@/lib/llm'
import { DEMOS } from '@/lib/learn'
import type { FormState } from './actions'

const str = (fd: FormData, k: string, max = 4000) => String(fd.get(k) ?? '').trim().slice(0, max)
const date = (fd: FormData, k: string) => {
  const v = str(fd, k, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}
const pick = (v: string, opts: string[], d: string) => (opts.includes(v) ? v : d)
const back = (id: string, q = '') => redirect(`/app/decisions/${id}${q}`)
const fail = (id: string, msg: string): never => back(id, `?error=${encodeURIComponent(msg)}`) as never

/* ---------- next actions ---------- */
export async function addTask(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireInternal()
  const title = str(fd, 'title', 300)
  if (title.length < 3) return { error: 'Describe the action in a few words.' }
  const { error } = await ctx.sb.from('lois_tasks').insert({
    tenant_id: ctx.ws.tenant_id, title, why: str(fd, 'why', 400) || null, how: str(fd, 'how', 400) || null,
    kind: pick(str(fd, 'kind', 10), ['blocker', 'setup', 'learn'], 'setup'), priority: Number(pick(str(fd, 'priority', 1), ['1', '2', '3', '4', '5'], '3')), source: 'Added in the app',
  })
  if (error) return { error: error.message }
  revalidatePath('/app/control')
  return { ok: true, message: 'Action added.' }
}

export async function completeTask(fd: FormData) {
  const ctx = await requireInternal()
  const id = str(fd, 'id', 64)
  await ctx.sb.from('lois_tasks').update({ status: 'done', done_at: new Date().toISOString() }).eq('task_id', id)
  await ctx.sb.from('lois_audit').insert({ tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, action: 'Action completed', target: id })
  revalidatePath('/app/control')
}

/* ---------- memory ---------- */
export async function addMemory(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireInternal()
  const text = str(fd, 'text', 600)
  if (text.length < 3) return { error: 'Write one clear sentence first.' }
  const type = pick(str(fd, 'type', 10), ['fact', 'decision', 'lesson', 'risk', 'idea'], 'fact')
  const { error } = await ctx.sb.from('lois_memory').insert({ tenant_id: ctx.ws.tenant_id, type, text, source: 'Added in the app', created_by: ctx.user.id })
  if (error) return { error: error.message }
  await ctx.sb.from('lois_audit').insert({ tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, action: 'Memory added', target: type })
  revalidatePath('/app/memory')
  return { ok: true, message: 'Saved to memory.' }
}

/* ---------- decisions ---------- */
export async function createBrief(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireInternal()
  const title = str(fd, 'title', 200)
  const maker = str(fd, 'decision_maker', 80)
  if (title.length < 6 || !maker) return { error: 'Add the decision (a short sentence) and who decides.' }
  const amount = Number(str(fd, 'amount', 14))
  const evidence = str(fd, 'evidence', 300)
  const { data: row, error } = await ctx.sb
    .from('lois_decision_briefs')
    .insert({
      tenant_id: ctx.ws.tenant_id, title, arm: str(fd, 'arm', 80) || null, requester: ctx.user.email ?? maker, decision_maker: maker,
      deadline: date(fd, 'deadline'), reversibility: pick(str(fd, 'reversibility', 30), ['Easy to reverse', 'Hard to reverse', 'Cannot be reversed'], 'Easy to reverse'),
      affected: str(fd, 'affected', 160) || null, sensitivity: pick(str(fd, 'sensitivity', 10), ['Normal', 'Sensitive'], 'Normal'),
      risk: pick(str(fd, 'risk', 10), ['low', 'medium', 'high'], 'low'), amount_kes: Number.isFinite(amount) && amount > 0 ? amount : null,
      evidence_present: Boolean(evidence), evidence_note: evidence || null, status: 'draft', version: 0, created_by: ctx.user.id,
    })
    .select('brief_id')
    .single()
  if (error || !row) return { error: error?.message ?? 'Could not save the draft.' }
  await ctx.sb.from('lois_audit').insert({ tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, action: 'Draft decision created', target: title.slice(0, 80) })
  redirect(`/app/decisions/${row.brief_id}`)
}

export async function submitBrief(fd: FormData) {
  const ctx = await requireInternal()
  const id = str(fd, 'id', 64)
  const { data: b } = await ctx.sb.from('lois_decision_briefs').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('brief_id', id).eq('status', 'draft').select('title').maybeSingle()
  if (b) await ctx.sb.from('lois_audit').insert({ tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, action: 'Draft submitted for decision', target: b.title })
  back(id)
}

export async function saveEvidence(fd: FormData) {
  const ctx = await requireInternal()
  const id = str(fd, 'id', 64)
  const note = str(fd, 'evidence', 300)
  const { error } = await ctx.sb.from('lois_decision_briefs').update({
    evidence_present: Boolean(note), evidence_note: note || null, evidence_date: date(fd, 'evidence_date'),
    source_state: pick(str(fd, 'source_state', 12), ['validated', 'unvalidated'], '') || null, updated_at: new Date().toISOString(),
  }).eq('brief_id', id)
  if (error) fail(id, error.message)
  await ctx.sb.from('lois_audit').insert({ tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, action: 'Evidence updated', target: id })
  back(id)
}

async function loadBrief(id: string) {
  const ctx = await requireInternal()
  const { data: b } = await ctx.sb.from('lois_decision_briefs').select('*').eq('brief_id', id).maybeSingle()
  if (!b) redirect('/app/decisions')
  return { ctx, b: b as Record<string, unknown> & { title: string; challenge: unknown; brief_text: string | null; version: number } }
}

const describe = (b: Record<string, unknown>) =>
  [`REQUEST: ${b.title}`, `ARM: ${b.arm ?? 'not stated'}`, `REQUESTER: ${b.requester ?? 'not stated'}`, `RISK: ${b.risk}`, `AMOUNT: ${b.amount_kes ? 'KES ' + b.amount_kes : 'not stated'}`,
    `DEADLINE: ${b.deadline ?? 'not stated'}`, `REVERSIBILITY: ${b.reversibility}`, `AFFECTED: ${b.affected ?? 'not stated'}`, `EVIDENCE: ${b.evidence_present ? b.evidence_note : 'NONE ATTACHED'}`].join('\n')

export async function generateBrief(fd: FormData) {
  const id = str(fd, 'id', 64)
  if (!llmEnabled()) return back(id, '?error=' + encodeURIComponent(NO_LLM))
  const { ctx, b } = await loadBrief(id)
  const { data: mem } = await ctx.sb.from('lois_memory').select('type, text').eq('tenant_id', ctx.ws.tenant_id).order('created_at', { ascending: false }).limit(10)
  const text = await generate(
    'Turn this request into a decision brief draft for a human who will decide. Use these headings exactly: THE REQUEST (verbatim). VERIFIED FACTS (only values present in the record, name the field). ATTRIBUTED CLAIMS. ASSUMPTIONS. UNKNOWNS (each with who could supply it). OPTIONS (at least two when possible, each with costs, benefits, risks, reversibility, affected people). RECOMMENDATION (with the evidence behind it; any confidence word is a judgement, not a measured probability). STRONGEST COUNTER-CASE. WHAT WOULD CHANGE THE RECOMMENDATION. DEADLINE. ONE-SENTENCE RATIONALE. Do not invent facts. Under 320 words.\n\n' +
      data(describe(b) + '\n\nRELEVANT MEMORY\n' + ((mem ?? []).map((m) => `- ${m.type}: ${m.text}`).join('\n') || 'none')),
  )
  if (!text) return fail(id, 'The draft did not finish. Try again in a moment.')
  await ctx.sb.from('lois_decision_briefs').update({ brief_text: text, updated_at: new Date().toISOString() }).eq('brief_id', id)
  back(id)
}

export async function challengeBrief(fd: FormData) {
  const id = str(fd, 'id', 64)
  if (!llmEnabled()) return back(id, '?error=' + encodeURIComponent(NO_LLM))
  const { ctx, b } = await loadBrief(id)
  if (!b.brief_text) return fail(id, 'Draft the brief first.')
  const text = await generate(
    'Review this decision brief as a thoughtful critic. Find the strongest case against the recommendation, assumptions that may fail, missing or stale evidence, conflicts, overlooked affected groups, implementation constraints and second-order effects. Rank by consequence and reversibility. Distinguish evidence from inference. Do not change the recommendation. Reply with only a JSON array of at most 6 objects: {"point":string,"consequence":"high|medium|low","reversibility":"easy|hard|irreversible","resolve":"the evidence that would resolve it"}.\n\n' +
      data(describe(b) + '\n\nBRIEF:\n' + b.brief_text),
    { max: 900 },
  )
  let points: unknown[] = []
  try {
    const m = text?.match(/\[[\s\S]*\]/)
    points = m ? JSON.parse(m[0]) : []
  } catch {
    points = []
  }
  const clean = (Array.isArray(points) ? points : []).slice(0, 6).map((p) => {
    const o = p as Record<string, unknown>
    return { point: String(o.point ?? '').slice(0, 400), consequence: String(o.consequence ?? '').slice(0, 20), reversibility: String(o.reversibility ?? '').slice(0, 20), resolve: String(o.resolve ?? '').slice(0, 300), mark: 'unresolved' }
  }).filter((p) => p.point)
  if (!clean.length) return fail(id, 'The challenge did not finish. Try again in a moment.')
  await ctx.sb.from('lois_decision_briefs').update({ challenge: clean, updated_at: new Date().toISOString() }).eq('brief_id', id)
  back(id)
}

export async function markChallenge(fd: FormData) {
  const { ctx, b } = await loadBrief(str(fd, 'id', 64))
  const i = Number(fd.get('i'))
  const mark = pick(str(fd, 'mark', 12), ['accepted', 'rejected', 'unresolved'], 'unresolved')
  const list = (Array.isArray(b.challenge) ? b.challenge : []) as Record<string, unknown>[]
  if (!list[i]) return back(String(b.brief_id))
  list[i] = { ...list[i], mark }
  await ctx.sb.from('lois_decision_briefs').update({ challenge: list, updated_at: new Date().toISOString() }).eq('brief_id', String(b.brief_id))
  back(String(b.brief_id))
}

export async function generateHandoff(fd: FormData) {
  const id = str(fd, 'id', 64)
  if (!llmEnabled()) return back(id, '?error=' + encodeURIComponent(NO_LLM))
  const { ctx, b } = await loadBrief(id)
  if (b.status !== 'approved') return fail(id, 'Only an approved decision has an execution preview.')
  const { data: rec } = await ctx.sb.from('lois_decision_records').select('version, reason, conditions, review_date, correlation').eq('brief_id', id).order('version', { ascending: false }).limit(1).maybeSingle()
  const text = await generate(
    "Convert this human-approved decision and its conditions into a proposed execution plan. List tasks, accountable roles, dependencies, deadlines, acceptance evidence, and failure or rollback paths. Keep the decision ID, version and correlation ID. List external actions separately and mark each 'awaiting explicit execution authorisation'. Do not claim anything was sent, paid, published or changed. Flag missing owners, permissions or idempotency keys. Under 250 words.\n\n" +
      data(JSON.stringify({ id, title: b.title, ...rec })),
  )
  if (!text) return fail(id, 'The preview did not finish. Try again in a moment.')
  await ctx.sb.from('lois_decision_briefs').update({ handoff_text: text, updated_at: new Date().toISOString() }).eq('brief_id', id)
  back(id)
}

export async function requestEvidence(fd: FormData) {
  const ctx = await requireInternal()
  const id = str(fd, 'id', 64)
  const owner = str(fd, 'owner', 80)
  const text = str(fd, 'text', 300)
  if (!owner || text.length < 4) return fail(id, 'Name an owner and what is needed.')
  const { error } = await ctx.sb.from('lois_evidence_requests').insert({ tenant_id: ctx.ws.tenant_id, brief_id: id, owner, due: date(fd, 'due'), text, actor: ctx.user.id })
  if (error) return fail(id, error.message)
  await ctx.sb.from('lois_decision_briefs').update({ status: 'needs_info', updated_at: new Date().toISOString() }).eq('brief_id', id).eq('status', 'pending')
  await ctx.sb.from('lois_audit').insert({ tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, action: 'Evidence requested', target: id, note: `Owner ${owner}` })
  back(id)
}

export async function recordDecision(fd: FormData) {
  const ctx = await requireInternal()
  const id = str(fd, 'id', 64)
  const { error } = await ctx.sb.rpc('lois_record_decision', {
    p_brief: id, p_decision: str(fd, 'decision', 12), p_reason: str(fd, 'reason', 600),
    p_conditions: str(fd, 'conditions', 400) || null, p_review: date(fd, 'review'), p_expected: str(fd, 'expected', 400) || null,
  })
  if (error) return fail(id, error.message)
  back(id, '?recorded=1')
}

export async function saveLearning(fd: FormData) {
  const ctx = await requireInternal()
  const id = str(fd, 'id', 64)
  const { error } = await ctx.sb.rpc('lois_save_learning', { p_brief: id, p_outcome: str(fd, 'outcome', 500) })
  if (error) return fail(id, error.message)
  back(id)
}

/* ---------- sandbox tools, briefing ---------- */
export type GenState = { text?: string; error?: string } | null

export async function runDemo(_: GenState, fd: FormData): Promise<GenState> {
  await requireInternal()
  const demo = DEMOS.find((d) => d.id === str(fd, 'demo', 20))
  const input = str(fd, 'input', 6000)
  if (!demo || !input) return { error: 'Add some text first.' }
  if (!llmEnabled()) return { error: NO_LLM }
  const text = await generate(demo.prompt + '\n\n' + data(input), { max: 800 })
  return text ? { text } : { error: 'That did not finish. Try again in a moment.' }
}

export async function rateDemo(fd: FormData) {
  const ctx = await requireInternal()
  const demo = DEMOS.find((d) => d.id === str(fd, 'demo', 20))
  if (!demo) return
  const up = str(fd, 'v', 4) === 'up'
  await ctx.sb.from('lois_memory').insert({ tenant_id: ctx.ws.tenant_id, type: 'lesson', text: `Sandbox tool "${demo.title}" was rated ${up ? 'useful' : 'not useful'}. Measure: ${demo.measure}`.slice(0, 600), source: 'Sandbox rating', created_by: ctx.user.id })
  revalidatePath('/app/memory')
}

export async function briefMe(_: GenState): Promise<GenState> {
  const ctx = await requireInternal()
  if (!llmEnabled()) return { error: NO_LLM }
  const t = ctx.ws.tenant_id
  const [tasks, briefs, scen, mem] = await Promise.all([
    ctx.sb.from('lois_tasks').select('title, kind, source').eq('tenant_id', t).eq('status', 'open').limit(15),
    ctx.sb.from('lois_decision_briefs').select('title, risk, evidence_present, status').eq('tenant_id', t).in('status', ['pending', 'needs_info']).limit(15),
    ctx.sb.from('lois_scenarios').select('name, is_on, state, plain, source').eq('tenant_id', t).limit(30),
    ctx.sb.from('lois_memory').select('type, text, example').eq('tenant_id', t).order('created_at', { ascending: false }).limit(15),
  ])
  const ctxText = [
    'OPEN ACTIONS\n' + ((tasks.data ?? []).map((x) => `- ${x.title} (${x.kind}; ${x.source ?? ''})`).join('\n') || 'none'),
    'PENDING DECISIONS\n' + ((briefs.data ?? []).map((x) => `- ${x.title}: ${x.risk} risk, evidence ${x.evidence_present ? 'yes' : 'NO'}, ${x.status}`).join('\n') || 'none'),
    'AUTOMATIONS (reported snapshot)\n' + ((scen.data ?? []).map((x) => `- ${x.name}: ${x.is_on ? 'on' : 'off'}, ${x.state}. ${x.plain ?? ''}`).join('\n') || 'none'),
    'RECENT MEMORY\n' + ((mem.data ?? []).map((x) => `- [${x.example ? 'EXAMPLE' : 'REAL'} ${x.type}] ${x.text}`).join('\n') || 'none'),
    'KNOWN GAPS: no outcome ledger is verified and no backup recovery point exists unless listed above.',
  ].join('\n\n')
  const text = await generate('Write a morning briefing for the owner using only the data below. Format: HEADLINE (one sentence). WHAT NEEDS YOU TODAY (max 3, ordered). WHAT IS HEALTHY. WHAT I CANNOT SEE YET. MY RECOMMENDATION with confidence. Keep it under 220 words.\n\n' + data(ctxText))
  return text ? { text } : { error: 'That did not finish. Try again in a moment.' }
}
