// Kept free of path aliases so the routing rules can be unit-tested directly.
const data = (s: string) => `<data>\n${s.replace(/<\/?data>/gi, '')}\n</data>`

/**
 * AI Studio router. One request, several models, shared context.
 * Every provider is optional and read from environment variables, so the app stays free until keys are added.
 * Free tiers exist for Google (AI Studio), Groq and OpenRouter ":free" models; Anthropic is paid.
 */
export type Task = 'reasoning' | 'writing' | 'code' | 'quick' | 'summarise' | 'extract' | 'general'
export type ProviderId = 'google' | 'groq' | 'openrouter' | 'anthropic'
export type Turn = { role: 'user' | 'assistant'; content: string; model?: string | null }
export type Reply = { provider: ProviderId; model: string; text: string; ms: number }

export const TASKS: Record<Task, string> = {
  reasoning: 'Reasoning and planning',
  writing: 'Writing and tone',
  code: 'Code and formulas',
  quick: 'Quick answer',
  summarise: 'Summarising long text',
  extract: 'Extracting facts and checking',
  general: 'General help',
}

type Provider = { id: ProviderId; label: string; free: boolean; env: string; model: () => string; fit: Record<Task, number> }

// Fit scores (0 to 10) are our judgement of where each family is strongest. They only order the choice; edit freely.
export const PROVIDERS: Provider[] = [
  { id: 'anthropic', label: 'Claude', free: false, env: 'ANTHROPIC_API_KEY', model: () => process.env.LOIS_LLM_MODEL || 'claude-haiku-5-5', fit: { reasoning: 9, writing: 10, code: 9, quick: 6, summarise: 8, extract: 9, general: 9 } },
  { id: 'google', label: 'Gemini', free: true, env: 'GOOGLE_API_KEY', model: () => process.env.LOIS_MODEL_GOOGLE || 'gemini-2.5-flash', fit: { reasoning: 8, writing: 7, code: 8, quick: 7, summarise: 10, extract: 8, general: 8 } },
  { id: 'groq', label: 'Llama on Groq', free: true, env: 'GROQ_API_KEY', model: () => process.env.LOIS_MODEL_GROQ || 'llama-3.3-70b-versatile', fit: { reasoning: 6, writing: 7, code: 7, quick: 10, summarise: 6, extract: 7, general: 7 } },
  { id: 'openrouter', label: 'OpenRouter free models', free: true, env: 'OPENROUTER_API_KEY', model: () => process.env.LOIS_MODEL_OPENROUTER || 'meta-llama/llama-3.3-70b-instruct:free', fit: { reasoning: 7, writing: 6, code: 7, quick: 6, summarise: 6, extract: 6, general: 6 } },
]

const keyOf = (p: Provider) => (p.id === 'google' ? process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY : process.env[p.env])
export const enabledProviders = () => PROVIDERS.filter((p) => Boolean(keyOf(p)))
export const providerStatus = () => PROVIDERS.map((p) => ({ id: p.id, label: p.label, free: p.free, env: p.env, on: Boolean(keyOf(p)), model: p.model() }))

/** Plain rules, no model call: cheap and predictable. */
export function classifyTask(prompt: string): Task {
  const t = prompt.toLowerCase()
  if (prompt.length > 6000) return 'summarise'
  if (/\b(summari[sz]e|tl;?dr|shorten|condense|key points)\b/.test(t)) return 'summarise'
  if (/\b(code|function|regex|sql|formula|script|bug|api|json|python|javascript)\b/.test(t)) return 'code'
  if (/\b(extract|list all|pull out|find the|check|verify|fact[- ]check|proofread|classif)\b/.test(t)) return 'extract'
  if (/\b(write|draft|rewrite|tone|email|post|caption|headline|slogan|pitch)\b/.test(t)) return 'writing'
  if (/\b(why|plan|strategy|trade-?off|decide|compare|should we|root cause|analy[sz]e|steps to)\b/.test(t)) return 'reasoning'
  if (prompt.length < 80) return 'quick'
  return 'general'
}

/** Best enabled providers for a task, strongest first. */
export function rank(task: Task, exclude: ProviderId[] = []): Provider[] {
  return enabledProviders().filter((p) => !exclude.includes(p.id)).sort((a, b) => b.fit[task] - a.fit[task])
}

/** Shared context: rolling summary + knowledge + recent turns, identical for every model so a handoff loses nothing. */
export function buildContext(opts: { summary: string; knowledge: string; history: Turn[]; handoff?: string }) {
  const hist = opts.history.slice(-8).map((t) => `${t.role === 'user' ? 'Person' : `Assistant${t.model ? ` (${t.model})` : ''}`}: ${t.content.slice(0, 1200)}`).join('\n')
  return [
    opts.summary ? `Session so far:\n${opts.summary}` : '',
    opts.knowledge ? `Approved knowledge (use only if relevant, cite titles):\n${data(opts.knowledge)}` : '',
    hist ? `Recent turns (earlier answers may come from other models; continue seamlessly):\n${data(hist)}` : '',
    opts.handoff ?? '',
  ].filter(Boolean).join('\n\n')
}

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(28000) })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export async function callModel(p: Provider, context: string, prompt: string, max = 900): Promise<Reply> {
  const { RULES } = await import('./llm')
  const model = p.model()
  const system = RULES + (context ? `\n\n${context}` : '')
  const t0 = Date.now()
  let text = ''
  if (p.id === 'anthropic') {
    const j = (await post('https://api.anthropic.com/v1/messages', { 'x-api-key': keyOf(p)!, 'anthropic-version': '2023-06-01' }, { model, max_tokens: max, system, messages: [{ role: 'user', content: prompt }] })) as { content?: { text?: string }[] }
    text = (j.content ?? []).map((b) => b.text ?? '').join('')
  } else if (p.id === 'google') {
    const j = (await post(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, { 'x-goog-api-key': keyOf(p)! }, { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: max } })) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    text = (j.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? '').join('')
  } else {
    const url = p.id === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://openrouter.ai/api/v1/chat/completions'
    const j = (await post(url, { authorization: `Bearer ${keyOf(p)}` }, { model, max_tokens: max, messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] })) as { choices?: { message?: { content?: string } }[] }
    text = j.choices?.[0]?.message?.content ?? ''
  }
  text = text.trim()
  if (!text) throw new Error('empty')
  return { provider: p.id, model, text, ms: Date.now() - t0 }
}

export type Step = { step: string; task: Task; reason: string; reply: Reply | null; error?: string }

/** Auto: best model for the task; if it fails, hand off to the next best with the same context. */
export async function runAuto(task: Task, context: string, prompt: string): Promise<Step[]> {
  const steps: Step[] = []
  for (const p of rank(task)) {
    try {
      const reply = await callModel(p, context, prompt)
      steps.push({ step: 'answer', task, reason: steps.length ? `Handed off to ${p.label} after ${steps.map((s) => s.reply?.provider ?? 'a model').join(', ')} failed` : `${p.label} is the strongest connected model for: ${TASKS[task].toLowerCase()}`, reply })
      return steps
    } catch (e) {
      steps.push({ step: 'attempt', task, reason: `${p.label} did not answer (${e instanceof Error ? e.message : 'error'})`, reply: null, error: 'failed' })
    }
  }
  return steps
}

/** Compare: the same prompt on up to three different providers, side by side. */
export async function runCompare(task: Task, context: string, prompt: string): Promise<Step[]> {
  const picks = rank(task).slice(0, 3)
  return Promise.all(picks.map(async (p): Promise<Step> => {
    try {
      return { step: p.label, task, reason: `Included: ${p.label}`, reply: await callModel(p, context, prompt) }
    } catch (e) {
      return { step: p.label, task, reason: `${p.label} did not answer (${e instanceof Error ? e.message : 'error'})`, reply: null, error: 'failed' }
    }
  }))
}

/** Chain: plan (reasoning), draft (writing), check (extract). Each step is handed the one before, ideally from a different model. */
export async function runChain(context: string, prompt: string): Promise<Step[]> {
  const out: Step[] = []
  const used: ProviderId[] = []
  const stages: { step: string; task: Task; ask: (prev: string) => string }[] = [
    { step: 'Plan', task: 'reasoning', ask: () => `Make a short numbered plan (max 6 steps) for this request. Do not answer yet.\n\n${data(prompt)}` },
    { step: 'Draft', task: 'writing', ask: (prev) => `Using this plan, write the best answer to the request. Keep it clear and complete.\n\nPlan:\n${data(prev)}\n\nRequest:\n${data(prompt)}` },
    { step: 'Check', task: 'extract', ask: (prev) => `Review this draft against the request and the approved knowledge. List any claim that is not supported, then give the corrected final answer.\n\nDraft:\n${data(prev)}\n\nRequest:\n${data(prompt)}` },
  ]
  let prev = ''
  for (const s of stages) {
    const candidates = rank(s.task, used).concat(rank(s.task).filter((p) => used.includes(p.id)))
    let done = false
    for (const p of candidates) {
      try {
        const reply = await callModel(p, context, s.ask(prev), 1000)
        out.push({ step: s.step, task: s.task, reason: `${s.step} by ${p.label}`, reply })
        prev = reply.text
        used.push(p.id)
        done = true
        break
      } catch {
        /* try the next provider */
      }
    }
    if (!done) {
      out.push({ step: s.step, task: s.task, reason: `No model could do the ${s.step.toLowerCase()} step`, reply: null, error: 'failed' })
      break
    }
  }
  return out
}

/** Rolling shared memory without another model call: question, who answered, first lines. */
export function nextSummary(prev: string, q: string, model: string, a: string) {
  const line = `- Asked: ${q.replace(/\s+/g, ' ').slice(0, 140)} → ${model}: ${a.replace(/\s+/g, ' ').slice(0, 220)}`
  const all = (prev ? prev + '\n' : '') + line
  return all.length <= 3800 ? all : all.slice(all.length - 3800).replace(/^[^\n]*\n/, '')
}
