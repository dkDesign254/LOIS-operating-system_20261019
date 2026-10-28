// Agent-readiness scan. Pure functions, no network: give it a fetched page and the side files and it returns scores and a prioritised list.
// Alias-free so it can be unit tested directly.
export type Check = { id: string; measure: 'discovery' | 'access' | 'usability' | 'trust'; label: string; ok: boolean; note: string; weight: number; impact: 1 | 2 | 3; effort: 1 | 2 | 3; fix: string; guide: string }
export type Action = { id: string; title: string; why: string; impact: 1 | 2 | 3; effort: 1 | 2 | 3; guide: string }
export type Page = { url: string; status: number; ms: number; html: string }
export type Extras = { robots: string | null; sitemap: boolean; llms: boolean }
export type Result = { scores: Record<'discovery' | 'access' | 'usability' | 'trust', number>; checks: Check[]; actions: Action[] }

export const MEASURES = {
  discovery: { label: 'Discovery', text: 'Can agents and search engines find and understand what you offer?' },
  access: { label: 'Access', text: 'Are they allowed in, and does the page load quickly with real content?' },
  usability: { label: 'Usability', text: 'Is the page structured so a machine can read it and act on it?' },
  trust: { label: 'Trust', text: 'Are there clear ways to contact you and see how you handle data?' },
} as const

export const AI_BOTS = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot']

const tag = (html: string, re: RegExp) => html.match(re)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''
const metaContent = (html: string, attr: 'name' | 'property', val: string) => {
  const m = html.match(new RegExp(`<meta[^>]*${attr}=["']${val}["'][^>]*>`, 'i'))?.[0] ?? ''
  return m.match(/content=["']([^"']*)["']/i)?.[1]?.trim() ?? ''
}

export function robotsGroups(robots: string): { agents: string[]; disallow: string[]; allow: string[] }[] {
  const groups: { agents: string[]; disallow: string[]; allow: string[] }[] = []
  let cur: { agents: string[]; disallow: string[]; allow: string[] } | null = null
  let lastWasAgent = false
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim()
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const k = m[1].toLowerCase()
    const v = m[2].trim()
    if (k === 'user-agent') {
      if (!cur || !lastWasAgent) { cur = { agents: [], disallow: [], allow: [] }; groups.push(cur) }
      cur.agents.push(v.toLowerCase())
      lastWasAgent = true
    } else {
      lastWasAgent = false
      if (cur && k === 'disallow') cur.disallow.push(v)
      if (cur && k === 'allow') cur.allow.push(v)
    }
  }
  return groups
}
const blocksAll = (g: { disallow: string[]; allow: string[] }) => g.disallow.includes('/') && !g.allow.includes('/')

export function blockedAiBots(robots: string | null): string[] {
  if (!robots) return []
  const gs = robotsGroups(robots)
  return AI_BOTS.filter((b) => gs.some((g) => g.agents.includes(b.toLowerCase()) && blocksAll(g)))
}
export const blocksEveryone = (robots: string | null) => (robots ? robotsGroups(robots).some((g) => g.agents.includes('*') && blocksAll(g)) : false)

export function visibleText(html: string): string {
  return html.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export function analyze(p: Page, x: Extras): Result {
  const h = p.html
  const title = tag(h, /<title[^>]*>([\s\S]*?)<\/title>/i)
  const desc = metaContent(h, 'name', 'description')
  const h1s = (h.match(/<h1(?=[\s>])/gi) ?? []).length
  const h2s = (h.match(/<h2(?=[\s>])/gi) ?? []).length
  const imgs = h.match(/<img\b[^>]*>/gi) ?? []
  const withAlt = imgs.filter((i) => /\balt=["'][^"']+["']/i.test(i)).length
  const inputs = (h.match(/<(input|select|textarea)\b[^>]*>/gi) ?? []).filter((i) => !/type=["']?(hidden|submit|button|image|reset)/i.test(i))
  const wrapped = (h.match(/<label\b[^>]*>[\s\S]*?<\/label>/gi) ?? []).join('')
  const labelled = inputs.filter((i) => wrapped.includes(i) || /aria-label=|aria-labelledby=|\bplaceholder=/i.test(i) || (i.match(/\bid=["']([^"']+)["']/i) && new RegExp(`<label[^>]*for=["']${i.match(/\bid=["']([^"']+)["']/i)![1]}["']`, 'i').test(h))).length
  const text = visibleText(h)
  const ld = /<script[^>]*type=["']application\/ld\+json["']/i.test(h)
  const ai = blockedAiBots(x.robots)
  const noindex = /<meta[^>]*name=["']robots["'][^>]*noindex/i.test(h)

  const c = (id: string, measure: Check['measure'], label: string, ok: boolean, note: string, weight: number, impact: 1 | 2 | 3, effort: 1 | 2 | 3, fix: string, guide: string): Check => ({ id, measure, label, ok, note, weight, impact, effort, fix, guide })

  const checks: Check[] = [
    c('title', 'discovery', 'Page title', title.length >= 10 && title.length <= 70, title ? `${title.length} characters` : 'Missing', 2, 3, 1, 'Write a clear page title of 10 to 70 characters that says what the page is.', 'make-your-site-readable-to-ai'),
    c('description', 'discovery', 'Meta description', desc.length >= 50 && desc.length <= 175, desc ? `${desc.length} characters` : 'Missing', 2, 3, 1, 'Add a meta description of 50 to 170 characters in plain language.', 'make-your-site-readable-to-ai'),
    c('canonical', 'discovery', 'Canonical address', /<link[^>]*rel=["']canonical["']/i.test(h), 'Tells engines which address is the real one', 1, 2, 1, 'Add a canonical link so duplicates do not split your ranking.', 'make-your-site-readable-to-ai'),
    c('lang', 'discovery', 'Page language', /<html[^>]*\blang=["'][a-z]/i.test(h), 'Declared on the html tag', 1, 1, 1, 'Set the lang attribute on the html tag, for example lang="en".', 'make-your-site-readable-to-ai'),
    c('sitemap', 'discovery', 'Sitemap', x.sitemap, x.sitemap ? 'Found /sitemap.xml' : 'No /sitemap.xml found', 2, 2, 2, 'Publish a sitemap.xml listing your public pages.', 'make-your-site-readable-to-ai'),
    c('llms', 'discovery', 'llms.txt', x.llms, x.llms ? 'Found /llms.txt' : 'No /llms.txt found', 2, 2, 1, 'Publish a short llms.txt that tells AI systems what your site is and where the key pages are.', 'write-an-llms-txt'),
    c('robots', 'access', 'robots.txt', x.robots !== null, x.robots !== null ? 'Found' : 'Not found', 1, 2, 1, 'Publish a robots.txt, even a short one, so your crawl rules are explicit.', 'robots-txt-for-ai-crawlers'),
    c('open', 'access', 'Crawlers are not all blocked', !blocksEveryone(x.robots), blocksEveryone(x.robots) ? 'robots.txt blocks every crawler' : ai.length ? `Blocks ${ai.join(', ')} on purpose or by accident` : 'AI crawlers are allowed', 3, 3, 1, 'Remove the blanket Disallow: / unless you really want to be invisible.', 'robots-txt-for-ai-crawlers'),
    c('https', 'access', 'Secure connection', p.url.startsWith('https://'), p.url.startsWith('https://') ? 'HTTPS' : 'Not HTTPS', 3, 3, 2, 'Serve the site over HTTPS only.', 'make-your-site-readable-to-ai'),
    c('status', 'access', 'Page loads', p.status >= 200 && p.status < 300, `Status ${p.status || 'none'}`, 3, 3, 2, 'Make sure the page returns a normal 200 response.', 'make-your-site-readable-to-ai'),
    c('speed', 'access', 'Answers quickly', p.ms > 0 && p.ms < 2500, `${p.ms} ms from our server`, 1, 2, 2, 'Use caching and smaller pages so the first byte arrives in under 2.5 seconds.', 'make-your-site-readable-to-ai'),
    c('content', 'access', 'Real text without scripts', text.length >= 300, `${text.length} readable characters in the first load`, 3, 3, 3, 'Render your main content on the server so agents that do not run scripts can read it.', 'make-your-site-readable-to-ai'),
    c('noindex', 'access', 'Allowed to be indexed', !noindex, noindex ? 'A noindex tag is present' : 'No noindex tag', 2, 3, 1, 'Remove the noindex meta tag from pages you want found.', 'robots-txt-for-ai-crawlers'),
    c('h1', 'usability', 'One main heading', h1s === 1, `${h1s} h1 heading${h1s === 1 ? '' : 's'}`, 2, 2, 1, 'Use exactly one h1 that names the page.', 'structured-data-in-ten-minutes'),
    c('h2', 'usability', 'Sections have headings', h2s >= 2, `${h2s} h2 headings`, 1, 1, 1, 'Break the page into sections with h2 headings.', 'structured-data-in-ten-minutes'),
    c('viewport', 'usability', 'Works on phones', /<meta[^>]*name=["']viewport["']/i.test(h), 'Viewport tag', 2, 2, 1, 'Add the viewport meta tag so the page scales on phones.', 'make-your-site-readable-to-ai'),
    c('alt', 'usability', 'Images have descriptions', imgs.length === 0 || withAlt / imgs.length >= 0.9, imgs.length ? `${withAlt} of ${imgs.length} images have alt text` : 'No images', 2, 2, 2, 'Add short alt text to every meaningful image.', 'make-your-site-readable-to-ai'),
    c('forms', 'usability', 'Form fields are labelled', inputs.length === 0 || labelled / inputs.length >= 0.9, inputs.length ? `${labelled} of ${inputs.length} fields labelled` : 'No forms', 2, 2, 2, 'Give every form field a visible label so people and agents know what to enter.', 'make-your-site-readable-to-ai'),
    c('jsonld', 'usability', 'Structured data', ld, ld ? 'JSON-LD found' : 'No JSON-LD', 3, 3, 2, 'Add JSON-LD describing your organisation and key pages.', 'structured-data-in-ten-minutes'),
    c('og', 'usability', 'Share card', Boolean(metaContent(h, 'property', 'og:title') && metaContent(h, 'property', 'og:image')), 'Open Graph title and image', 1, 1, 1, 'Add Open Graph title and image tags.', 'structured-data-in-ten-minutes'),
    c('contact', 'trust', 'A way to contact you', /mailto:|tel:|href=["'][^"']*contact/i.test(h), 'Email, phone or contact page link', 2, 2, 1, 'Show an email, phone number or contact page link.', 'make-your-site-readable-to-ai'),
    c('privacy', 'trust', 'Privacy notice', /href=["'][^"']*privacy/i.test(h), 'Link to a privacy page', 2, 2, 1, 'Link to a privacy notice from every page footer.', 'make-your-site-readable-to-ai'),
  ]

  const scores = { discovery: 0, access: 0, usability: 0, trust: 0 }
  for (const m of Object.keys(scores) as (keyof typeof scores)[]) {
    const own = checks.filter((k) => k.measure === m)
    const total = own.reduce((s, k) => s + k.weight, 0)
    scores[m] = Math.round((own.filter((k) => k.ok).reduce((s, k) => s + k.weight, 0) / total) * 100)
  }
  const actions: Action[] = checks
    .filter((k) => !k.ok)
    .sort((a, b) => b.impact * 4 - b.effort - (a.impact * 4 - a.effort) || b.weight - a.weight)
    .slice(0, 8)
    .map((k) => ({ id: k.id, title: k.fix, why: `${k.label}: ${k.note}`, impact: k.impact, effort: k.effort, guide: k.guide }))
  return { scores, checks, actions }
}
