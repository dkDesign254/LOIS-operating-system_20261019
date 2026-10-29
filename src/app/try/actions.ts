'use server'
import { headers } from 'next/headers'
import { safeFetch, normaliseUrl } from '@/lib/safe-fetch'
import { analyze, type Result } from '@/lib/scan'

export type CheckState = { error?: string; host?: string; scores?: Result['scores']; actions?: { title: string; why: string }[]; failed?: string[] } | null

// Best-effort limit per visitor address, held in memory. It slows casual abuse; it resets when the server restarts.
const HITS = new Map<string, number[]>()
const LIMIT = 5
const WINDOW = 3600_000
const isHtml = (s: string) => /^\s*<(!doctype|html|head|body)/i.test(s)

export async function guestSiteCheck(_: CheckState, fd: FormData): Promise<CheckState> {
  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? 'unknown').split(',')[0].trim()
  const now = Date.now()
  const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW)
  if (recent.length >= LIMIT) return { error: `You have used ${LIMIT} free checks this hour. Create a free account for more, or try again later.` }
  if (HITS.size > 5000) HITS.clear()
  HITS.set(ip, [...recent, now])

  const u = normaliseUrl(String(fd.get('url') ?? ''))
  if (!u) return { error: 'Enter a public web address such as example.com.' }
  const o = u.origin
  const [page, robots, sitemap, llms] = await Promise.all([
    safeFetch(u.toString()),
    safeFetch(o + '/robots.txt', { maxBytes: 100_000, timeoutMs: 5000, redirects: 2 }),
    safeFetch(o + '/sitemap.xml', { maxBytes: 200_000, timeoutMs: 5000, redirects: 2 }),
    safeFetch(o + '/llms.txt', { maxBytes: 100_000, timeoutMs: 5000, redirects: 2 }),
  ])
  if (page.error || !page.text) return { error: page.error ?? 'The page returned nothing to read.' }
  const r = analyze(
    { url: page.url, status: page.status, ms: page.ms, html: page.text },
    {
      robots: robots.status === 200 && !isHtml(robots.text) ? robots.text : null,
      sitemap: sitemap.status === 200 && /<(urlset|sitemapindex)/i.test(sitemap.text),
      llms: llms.status === 200 && llms.text.trim().length > 20 && !isHtml(llms.text),
    },
  )
  return {
    host: u.hostname,
    scores: r.scores,
    actions: r.actions.slice(0, 3).map((a) => ({ title: a.title, why: a.why })),
    failed: r.checks.filter((c) => !c.ok).slice(0, 5).map((c) => c.label),
  }
}
