/** Splits text into ~1000 character passages on paragraph boundaries. */
export function chunkText(text: string, max = 1000, cap = 400): string[] {
  const paras = text.replace(/\r\n/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const out: string[] = []
  let cur = ''
  const push = () => {
    if (cur.trim()) out.push(cur.trim())
    cur = ''
  }
  for (const p of paras) {
    if (p.length > max) {
      push()
      const sentences = p.match(/[^.!?\n]+[.!?]*\s*/g) ?? [p]
      for (const s of sentences) {
        if ((cur + s).length > max) push()
        if (s.length > max) {
          for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max).trim())
        } else cur += s
      }
      push()
      continue
    }
    if ((cur + '\n\n' + p).length > max) push()
    cur += (cur ? '\n\n' : '') + p
  }
  push()
  return out.slice(0, cap)
}
