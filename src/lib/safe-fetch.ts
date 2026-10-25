import dns from 'node:dns/promises'
import net from 'node:net'

// Fetches a public web page without letting a visitor point LOIS at private networks (server-side request forgery guard).
export type Fetched = { ok: boolean; status: number; url: string; ms: number; text: string; headers: Record<string, string>; error?: string }

export function isPrivateIp(ip: string): boolean {
  const v = net.isIP(ip)
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number)
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  }
  if (v === 6) {
    const x = ip.toLowerCase()
    if (x === '::1' || x === '::') return true
    if (x.startsWith('::ffff:')) return isPrivateIp(x.slice(7))
    return x.startsWith('fc') || x.startsWith('fd') || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb')
  }
  return true
}

export function normaliseUrl(raw: string): URL | null {
  let s = raw.trim()
  if (!s) return null
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s
  try {
    const u = new URL(s)
    if (!['http:', 'https:'].includes(u.protocol)) return null
    if (u.username || u.password) return null
    if (u.port && !['80', '443'].includes(u.port)) return null
    if (!u.hostname.includes('.') || u.hostname.endsWith('.local') || u.hostname.endsWith('.internal')) return null
    u.hash = ''
    return u
  } catch {
    return null
  }
}

async function assertPublic(host: string) {
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('That address is private, so LOIS will not open it.')
    return
  }
  const addrs = await dns.lookup(host, { all: true })
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('That address is private, so LOIS will not open it.')
}

export async function safeFetch(raw: string, opts: { maxBytes?: number; timeoutMs?: number; redirects?: number } = {}): Promise<Fetched> {
  const maxBytes = opts.maxBytes ?? 1_500_000
  const t0 = Date.now()
  let u = normaliseUrl(raw)
  if (!u) return { ok: false, status: 0, url: raw, ms: 0, text: '', headers: {}, error: 'Enter a public web address such as example.com.' }
  try {
    for (let hop = 0; hop <= (opts.redirects ?? 3); hop++) {
      await assertPublic(u.hostname)
      const ctl = new AbortController()
      const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 8000)
      const res = await fetch(u, { redirect: 'manual', signal: ctl.signal, headers: { 'user-agent': 'LOIS-Readiness/1.0 (+https://lois-operating-system20261019.vercel.app)', accept: 'text/html,text/plain,application/xml;q=0.9,*/*;q=0.5' } }).finally(() => clearTimeout(timer))
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        const next = normaliseUrl(new URL(res.headers.get('location')!, u).toString())
        if (!next) return { ok: false, status: res.status, url: u.toString(), ms: Date.now() - t0, text: '', headers: {}, error: 'The site redirected somewhere LOIS will not follow.' }
        u = next
        continue
      }
      const reader = res.body?.getReader()
      let bytes = 0
      const chunks: Uint8Array[] = []
      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.length
        if (bytes > maxBytes) { await reader.cancel(); break }
        chunks.push(value)
      }
      const text = new TextDecoder().decode(Buffer.concat(chunks))
      const headers: Record<string, string> = {}
      res.headers.forEach((v, k) => (headers[k] = v))
      return { ok: res.ok, status: res.status, url: u.toString(), ms: Date.now() - t0, text, headers }
    }
    return { ok: false, status: 0, url: u.toString(), ms: Date.now() - t0, text: '', headers: {}, error: 'Too many redirects.' }
  } catch (e) {
    const msg = e instanceof Error ? (e.name === 'AbortError' ? 'The site took too long to answer.' : e.message) : 'Could not reach the site.'
    return { ok: false, status: 0, url: u?.toString() ?? raw, ms: Date.now() - t0, text: '', headers: {}, error: msg }
  }
}
