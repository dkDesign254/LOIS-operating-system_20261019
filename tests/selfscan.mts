import { analyze } from '../src/lib/scan.ts'
const base = 'http://localhost:3100'
const get = async (p: string) => { const t = Date.now(); const r = await fetch(base + p); return { status: r.status, text: await r.text(), ms: Date.now() - t } }
for (const path of ['/', '/try', '/resources', '/resources/write-an-llms-txt', '/privacy']) {
  const pg = await get(path)
  const robots = (await get('/robots.txt')).text
  const sm = (await get('/sitemap.xml')).status === 200
  const llms = (await get('/llms.txt')).status === 200
  const r = analyze({ url: 'https://lois-operating-system20261019.vercel.app' + path, status: pg.status, ms: pg.ms, html: pg.text }, { robots, sitemap: sm, llms })
  console.log(path, JSON.stringify(r.scores), 'fails:', r.checks.filter((c) => !c.ok).map((c) => c.id).join(','))
}
