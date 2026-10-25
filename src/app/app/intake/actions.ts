'use server'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'
import { chunkText } from '@/lib/chunk'
import { sha256 } from '@/lib/hash'
import { indexEmbeddings } from '@/lib/embed'
import { generate, llmEnabled, data as wrap } from '@/lib/llm'
import { extract } from '@/lib/extract'
import { LOW_CONFIDENCE, isGenericName, parseDraft, safeName } from '@/lib/intake'

export type IntakeRow = { file: string; stored: string; status: 'added' | 'duplicate' | 'empty' | 'failed'; note: string; confidence: number | null; passages: number; flagged: boolean }
export type IntakeState = { error?: string; rows?: IntakeRow[] } | null

const MAX_FILES = 4
const MAX_EACH = 3_500_000
const MAX_TOTAL = 4_000_000

const PROMPT = (name: string, text: string) =>
  `Read the document below and reply with ONLY a JSON object: {"title": string (max 12 words), "summary": string (2 to 4 plain sentences stating what this document says, nothing it does not say), "tags": string[] (up to 5 lower-case words), "confidence": number between 0 and 1 (how sure you are the summary is faithful; use below 0.5 if the text is garbled, partial or unclear)}. File name: ${name}\n\n${wrap(text.slice(0, 12000))}`

export async function intakeFiles(_: IntakeState, fd: FormData): Promise<IntakeState> {
  const ctx = await requireWorkspace()
  if (!['owner', 'admin', 'reviewer', 'member'].includes(ctx.ws.role)) return { error: 'You have read-only access. Ask an admin for the member role.' }
  const files = fd.getAll('files').filter((f): f is File => f instanceof File && f.size > 0)
  if (!files.length) return { error: 'Choose at least one file.' }
  if (files.length > MAX_FILES) return { error: `Add at most ${MAX_FILES} files at a time.` }
  if (files.some((f) => f.size > MAX_EACH) || files.reduce((s, f) => s + f.size, 0) > MAX_TOTAL) return { error: 'Files are limited to 3.5 MB each and 4 MB in total.' }
  const label = ['verified', 'reported', 'example'].includes(String(fd.get('label'))) ? String(fd.get('label')) : 'reported'
  const project = String(fd.get('project') ?? '').slice(0, 64) || null

  const rows: IntakeRow[] = []
  for (const f of files) {
    const stored = safeName(f.name)
    const row: IntakeRow = { file: f.name.slice(0, 120), stored, status: 'failed', note: '', confidence: null, passages: 0, flagged: false }
    rows.push(row)
    try {
      const bytes = Buffer.from(await f.arrayBuffer())
      const hash = sha256(bytes.toString('base64'))
      const { data: dup } = await ctx.sb.from('lois_documents').select('document_id, title').eq('tenant_id', ctx.ws.tenant_id).eq('content_hash', hash).eq('status', 'active').limit(1).maybeSingle()
      if (dup) { row.status = 'duplicate'; row.note = `Already added as "${dup.title}". Skipped.`; continue }

      const ex = await extract(bytes, f.name)
      if (ex.text.trim().length < 20) { row.status = 'empty'; row.note = ex.note ?? 'No readable text found.'; continue }

      let draft = null
      if (llmEnabled()) draft = parseDraft(await generate(PROMPT(f.name, ex.text)))
      const title = draft?.title ?? (isGenericName(f.name) ? ex.text.slice(0, 60).replace(/\s+/g, ' ').trim() : f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).slice(0, 160)
      row.confidence = draft?.confidence ?? null
      row.flagged = !draft || draft.confidence < LOW_CONFIDENCE || ex.method === 'ocr'

      const { data: doc, error } = await ctx.sb.from('lois_documents').insert({ tenant_id: ctx.ws.tenant_id, title, source_name: stored, source_type: 'upload', evidence_label: label, content: ex.text, content_hash: hash, created_by: ctx.user.id, project_id: project }).select('document_id').single()
      if (error || !doc) { row.note = error?.message ?? 'Could not save.'; continue }
      const chunks = chunkText(ex.text).map((c, i) => ({ tenant_id: ctx.ws.tenant_id, document_id: doc.document_id, ordinal: i, content: c }))
      for (let i = 0; i < chunks.length; i += 100) await ctx.sb.from('lois_document_chunks').insert(chunks.slice(i, i + 100))
      row.passages = chunks.length
      row.status = 'added'
      row.note = [ex.method === 'ocr' ? 'Read with AI.' : '', ex.note ?? '', draft ? '' : llmEnabled() ? 'The AI draft was unusable, so the file name was used as the title.' : 'No AI key set, so no summary was drafted.'].filter(Boolean).join(' ') || 'Added.'

      // AI drafts, a person approves: the summary waits in the knowledge bank and only teaches LOIS once accepted.
      if (draft) {
        await ctx.sb.from('lois_knowledge_items').insert({
          tenant_id: ctx.ws.tenant_id, title: draft.title, content: draft.summary, domain: draft.tags[0] ?? 'general', evidence_label: label === 'verified' ? 'reported' : label,
          status: 'pending_review', created_by: ctx.user.id, confidence: draft.confidence, project_id: project,
          metadata: { via: 'intake', document_id: doc.document_id, stored_name: stored, original_name: f.name.slice(0, 200), tags: draft.tags, method: ex.method, flagged: row.flagged },
        })
      }
    } catch (e) {
      row.note = e instanceof Error ? e.message.slice(0, 160) : 'Something went wrong with this file.'
    }
  }
  if (rows.some((r) => r.status === 'added')) await indexEmbeddings(ctx.sb, ctx.ws.tenant_id).catch(() => 0)
  revalidatePath('/app/knowledge')
  revalidatePath('/app/bank')
  return { rows }
}
