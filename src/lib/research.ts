// Web research: Gemini answers with Google Search grounding and returns the pages it used.
// Everything it finds is a claim from the web, not a fact LOIS holds. Nothing is stored unless a person proposes it to the bank.
export type WebSource = { title: string; url: string }
export type Research = { text: string; sources: WebSource[]; queries: string[]; model: string; ms: number }

const httpsOnly = (u: string) => { try { return new URL(u).protocol === 'https:' } catch { return false } }

export const researchEnabled = () => Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY)

export async function webResearch(question: string, knowledge = ''): Promise<Research> {
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY
  if (!key) throw new Error('no_key')
  const model = process.env.LOIS_MODEL_GOOGLE || 'gemini-2.5-flash'
  const t0 = Date.now()
  const system = 'You are LOIS, preparing research for a person who will decide. Use web search. Say what is established and what is disputed or uncertain. Give dates for anything that changes over time. Never invent a source. Keep it under 350 words. LOIS prepares and recommends; a person decides.' + (knowledge ? `\n\nThe organisation already holds this accepted knowledge. Note where the web agrees or conflicts with it:\n${knowledge}` : '')
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts: [{ text: question }] }], tools: [{ google_search: {} }], generationConfig: { maxOutputTokens: 1200 } }),
    signal: AbortSignal.timeout(40000),
  })
  if (!res.ok) throw new Error(String(res.status))
  const j = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: { webSearchQueries?: string[]; groundingChunks?: { web?: { uri?: string; title?: string } }[] } }[] }
  const c = j.candidates?.[0]
  const text = (c?.content?.parts ?? []).map((p) => p.text ?? '').join('').trim()
  if (!text) throw new Error('empty')
  const seen = new Set<string>()
  const sources: WebSource[] = []
  for (const g of c?.groundingMetadata?.groundingChunks ?? []) {
    const u = g.web?.uri
    if (u && httpsOnly(u) && !seen.has(u)) { seen.add(u); sources.push({ title: (g.web?.title ?? u).slice(0, 120), url: u }) }
  }
  return { text, sources: sources.slice(0, 8), queries: (c?.groundingMetadata?.webSearchQueries ?? []).slice(0, 5), model, ms: Date.now() - t0 }
}
