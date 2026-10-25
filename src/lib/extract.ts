import { MIME, TEXT_EXT, stripHtml } from './intake'

export type Extracted = { text: string; method: 'text' | 'pdf' | 'ocr'; note?: string }

const googleKey = () => process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY

/** Reads text from an image or PDF using Gemini (free tier). Returns null when no key is set or the call fails. */
export async function ocr(bytes: Buffer, mime: string): Promise<string | null> {
  const key = googleKey()
  if (!key) return null
  const model = process.env.LOIS_MODEL_GOOGLE || 'gemini-2.5-flash'
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mime, data: bytes.toString('base64') } }, { text: 'Transcribe all readable text in this file exactly as written, in reading order. Keep headings and lists as plain lines. Do not add commentary. If there is no readable text, reply with the single word NONE.' }] }],
        generationConfig: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(40000),
    })
    if (!r.ok) return null
    const j = (await r.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim() ?? ''
    return t && t !== 'NONE' ? t : null
  } catch {
    return null
  }
}

export async function extract(bytes: Buffer, name: string): Promise<Extracted> {
  const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase()
  if (TEXT_EXT.test(name)) {
    const raw = bytes.toString('utf8')
    return { text: (/\.html?$/i.test(name) ? stripHtml(raw) : raw).slice(0, 400000), method: 'text' }
  }
  if (ext === 'pdf') {
    try {
      const { extractText, getDocumentProxy } = await import('unpdf')
      const pdf = await getDocumentProxy(new Uint8Array(bytes))
      const { text } = await extractText(pdf, { mergePages: true })
      const t = (Array.isArray(text) ? text.join('\n') : text).trim()
      if (t.length >= 200) return { text: t.slice(0, 400000), method: 'pdf' }
    } catch {
      /* fall through to OCR */
    }
    const o = await ocr(bytes, MIME.pdf)
    return o ? { text: o.slice(0, 400000), method: 'ocr', note: 'Scanned or image-only PDF read with AI. Check the wording.' } : { text: '', method: 'pdf', note: 'No readable text. If this is a scan, connect a Google key to read it.' }
  }
  if (MIME[ext]) {
    const o = await ocr(bytes, MIME[ext])
    return o ? { text: o.slice(0, 400000), method: 'ocr', note: 'Read from the image with AI. Check the wording.' } : { text: '', method: 'ocr', note: 'Could not read this image. Connect a Google key to enable reading images.' }
  }
  return { text: '', method: 'text', note: 'This file type is not supported.' }
}
