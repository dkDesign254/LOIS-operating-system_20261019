'use server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'
import { safeFetch, normaliseUrl } from '@/lib/safe-fetch'
import { analyze } from '@/lib/scan'

const DAILY_SCANS = 15
const isHtml = (s: string) => /^\s*<(!doctype|html|head|body)/i.test(s)

export async function scanSite(fd: FormData) {
  const ctx = await requireWorkspace()
  const u = normaliseUrl(String(fd.get('url') ?? ''))
  if (!u) redirect('/app/readiness?error=' + encodeURIComponent('Enter a public web address such as example.com.'))

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await ctx.sb.from('lois_readiness_scans').select('scan_id', { count: 'exact', head: true }).eq('user_id', ctx.user.id).gte('created_at', since)
  if ((count ?? 0) >= DAILY_SCANS) redirect('/app/readiness?error=' + encodeURIComponent(`You have used today's ${DAILY_SCANS} scans. Try again tomorrow.`))

  const origin = u.origin
  const [page, robots, sitemap, llms] = await Promise.all([
    safeFetch(u.toString()),
    safeFetch(origin + '/robots.txt', { maxBytes: 100_000, timeoutMs: 5000, redirects: 2 }),
    safeFetch(origin + '/sitemap.xml', { maxBytes: 200_000, timeoutMs: 5000, redirects: 2 }),
    safeFetch(origin + '/llms.txt', { maxBytes: 100_000, timeoutMs: 5000, redirects: 2 }),
  ])
  if (page.error || !page.text) redirect('/app/readiness?error=' + encodeURIComponent(page.error ?? 'The page returned nothing to read.'))

  const result = analyze(
    { url: page.url, status: page.status, ms: page.ms, html: page.text },
    {
      robots: robots.status === 200 && !isHtml(robots.text) ? robots.text : null,
      sitemap: sitemap.status === 200 && /<(urlset|sitemapindex)/i.test(sitemap.text),
      llms: llms.status === 200 && llms.text.trim().length > 20 && !isHtml(llms.text),
    },
  )
  const { data, error } = await ctx.sb
    .from('lois_readiness_scans')
    .insert({ tenant_id: ctx.ws.tenant_id, url: page.url.slice(0, 500), host: u.hostname, scores: result.scores, checks: result.checks, actions: result.actions })
    .select('scan_id')
    .single()
  if (error || !data) redirect('/app/readiness?error=' + encodeURIComponent('The scan ran but could not be saved. Please try again.'))
  revalidatePath('/app/readiness')
  redirect(`/app/readiness?scan=${data.scan_id}`)
}

export async function deleteScan(fd: FormData) {
  const ctx = await requireWorkspace()
  await ctx.sb.from('lois_readiness_scans').delete().eq('scan_id', String(fd.get('id') ?? ''))
  revalidatePath('/app/readiness')
  redirect('/app/readiness')
}
