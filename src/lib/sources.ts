// Turns the "where did this come from" note on a knowledge entry into links a reviewer can open.
// Repository names in notes are short ("fashion-lucrebag: src/lib/ai.functions.ts"); this maps them to GitHub.
// Most of these repositories are private: the link opens only when the reviewer is signed in to GitHub with access.
const OWNER = 'dkDesign254'
const REPOS: Record<string, string> = {
  'fashion-lucrebag': 'fashion-lucrebag',
  'strategy-systems-hub': 'strategy-systems-hub',
  'nexusops-platform': 'nexusops-platform',
  'allwrite-press': 'allwrite-press-4e9f7e00',
  'agentops-competition': 'agentops-competition_20260521',
}

export type SourceLink = { label: string; url: string | null; note?: string }

const looksLikeFile = (p: string) => !p.split('/').includes('..') && /^[\w@./\-]+$/.test(p) && (p.includes('/') || /\.\w{1,6}$/.test(p))

export function sourceLinks(raw: unknown): SourceLink[] {
  if (typeof raw !== 'string' || !raw.trim()) return []
  const m = raw.match(/^([a-z0-9-]+):\s*(.+)$/i)
  if (!m) return [{ label: raw.slice(0, 200), url: null }]
  const repo = REPOS[m[1].toLowerCase()]
  if (!repo) return [{ label: raw.slice(0, 200), url: null }]
  const base = `https://github.com/${OWNER}/${repo}`
  return m[2].split(',').map((s) => s.trim()).filter(Boolean).slice(0, 6).map((p) => ({
    label: `${m[1]}: ${p}`,
    url: looksLikeFile(p) ? `${base}/blob/HEAD/${p.split('/').map(encodeURIComponent).join('/')}` : base,
    note: looksLikeFile(p) ? undefined : 'Opens the repository; this source is a topic, not one file.',
  }))
}
