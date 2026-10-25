// Document intake helpers. Pure and alias-free so they can be unit tested.

/** {yyyymmdd-hhmmss}-{slug}.{ext}: lower-case, safe characters only, at most 100 characters before the extension. */
export function safeName(rawName: string, now = new Date()): string {
  const original = rawName.split(/[\\/]/).pop() ?? ''
  const dot = original.lastIndexOf('.')
  const base = dot > 0 ? original.slice(0, dot) : original
  const ext = (dot > 0 ? original.slice(dot + 1) : 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin'
  const slug = base.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'file'
  const stamp = now.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15)
  return `${stamp}-${slug}.${ext}`
}

const generic = /^(img|dsc|image|photo|scan|screenshot|document|doc|file|untitled|whatsapp image)[\s_-]*\(?\d*\)?$/i
/** Camera and scanner default names say nothing about the content. */
export const isGenericName = (original: string) => generic.test(original.replace(/\.[^.]+$/, '').trim())

export type Draft = { title: string; summary: string; tags: string[]; confidence: number; label: 'verified' | 'reported' | 'example' }

/** Accepts only a well-formed model answer. Anything else returns null so a person is not shown invented structure. */
export function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null
  const m = raw.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const o = JSON.parse(m[0]) as Record<string, unknown>
    const title = typeof o.title === 'string' ? o.title.trim().slice(0, 160) : ''
    const summary = typeof o.summary === 'string' ? o.summary.trim().slice(0, 1500) : ''
    const conf = typeof o.confidence === 'number' ? o.confidence : NaN
    if (title.length < 3 || summary.length < 20 || !(conf >= 0 && conf <= 1)) return null
    const tags = Array.isArray(o.tags) ? o.tags.filter((t): t is string => typeof t === 'string').map((t) => t.trim().toLowerCase().slice(0, 30)).filter(Boolean).slice(0, 6) : []
    return { title, summary, tags, confidence: Math.round(conf * 100) / 100, label: 'reported' }
  } catch {
    return null
  }
}

export const LOW_CONFIDENCE = 0.5

export function stripHtml(html: string): string {
  return html.replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim()
}

export const TEXT_EXT = /\.(txt|md|csv|json|html?)$/i
export const IMAGE_EXT = /\.(png|jpe?g|webp)$/i
export const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', pdf: 'application/pdf' }
