'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getCtx, requireWorkspace, TENANT_COOKIE } from '@/lib/session'
import { answer, retrieve, citationsOf } from '@/lib/ask'
import { chunkText } from '@/lib/chunk'
import { newApiKey, newSecret, sha256 } from '@/lib/hash'
import { indexEmbeddings } from '@/lib/embed'
import { neonLog } from '@/lib/neon'
import { dispatch } from '@/lib/webhooks'
import { supabaseServer } from '@/lib/supabase/server'

const str = (fd: FormData, k: string, max = 4000) => String(fd.get(k) ?? '').trim().slice(0, max)
const LABELS = ['verified', 'reported', 'example']
const MODES = ['ask', 'untangle', 'decide', 'compare', 'learn']

export type FormState = { ok?: boolean; error?: string; message?: string; secret?: string } | null

/* ---------- workspace ---------- */

export async function createWorkspace(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getCtx()
  const name = str(fd, 'name', 80)
  if (name.length < 2) return { error: 'Give the workspace a name (2+ characters).' }
  const slug =
    name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) + '-' + Math.random().toString(36).slice(2, 6)
  const { data: t, error } = await ctx.sb
    .from('lois_tenants')
    .insert({ name, slug, tenant_type: 'client', plan: 'free', status: 'active', created_by: ctx.user.id })
    .select('tenant_id')
    .single()
  if (error || !t) return { error: error?.message ?? 'Could not create the workspace.' }
  const { error: mErr } = await ctx.sb.from('lois_memberships').insert({ tenant_id: t.tenant_id, user_id: ctx.user.id, role: 'owner' })
  if (mErr) return { error: mErr.message }
  ;(await cookies()).set(TENANT_COOKIE, t.tenant_id, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
  redirect('/app')
}

export async function switchWorkspace(fd: FormData) {
  const ctx = await getCtx()
  const id = str(fd, 'tenant', 64)
  if (ctx.workspaces.some((w) => w.tenant_id === id)) {
    ;(await cookies()).set(TENANT_COOKIE, id, { httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
  }
  redirect('/app')
}

export async function signOut() {
  const sb = await supabaseServer()
  await sb.auth.signOut()
  redirect('/')
}

/* ---------- assistant ---------- */

export async function askAction(fd: FormData) {
  const ctx = await requireWorkspace()
  const question = str(fd, 'question')
  if (!question) redirect('/app')
  const mode = MODES.includes(str(fd, 'mode', 20)) ? str(fd, 'mode', 20) : 'ask'
  const project = str(fd, 'project', 64) || null
  let conv = str(fd, 'conversation', 64) || null
  const t0 = Date.now()

  const { data: usage } = await ctx.sb.rpc('lois_bump_usage', { p_tenant: ctx.ws.tenant_id, p_kind: 'ask' })
  const u = Array.isArray(usage) ? usage[0] : usage
  if (u && u.allowed === false) redirect(`/app?error=quota${conv ? `&c=${conv}` : ''}`)

  if (!conv) {
    const { data: c, error } = await ctx.sb
      .from('lois_conversations')
      .insert({ tenant_id: ctx.ws.tenant_id, user_id: ctx.user.id, title: question.slice(0, 80), mode, project_id: project })
      .select('conversation_id')
      .single()
    if (error || !c) redirect('/app?error=save')
    conv = c.conversation_id as string
  }

  await ctx.sb.from('lois_messages').insert({ conversation_id: conv, tenant_id: ctx.ws.tenant_id, user_id: ctx.user.id, role: 'user', content: question })

  const { data: prof } = await ctx.sb.from('lois_profiles').select('tone, answer_length').eq('user_id', ctx.user.id).maybeSingle()
  let a
  try {
    a = await answer(ctx.sb, ctx.ws.tenant_id, question, { tone: prof?.tone ?? 'default', length: prof?.answer_length ?? 'normal' })
  } catch {
    redirect(`/app?c=${conv}&error=search`)
  }

  await ctx.sb.from('lois_messages').insert({
    conversation_id: conv,
    tenant_id: ctx.ws.tenant_id,
    user_id: ctx.user.id,
    role: 'assistant',
    content: a.content,
    citations: a.citations,
    confidence: a.confidence,
    answer_mode: a.mode,
  })
  await ctx.sb.from('lois_conversations').update({ updated_at: new Date().toISOString() }).eq('conversation_id', conv)

  await neonLog('ask', {
    tenant_id: ctx.ws.tenant_id,
    actor: ctx.user.id,
    query: question,
    mode: a.mode,
    results: a.hits.length,
    top_score: a.hits[0]?.score,
    latency_ms: Date.now() - t0,
    llm: a.llm,
  })
  revalidatePath('/app')
  redirect(`/app?c=${conv}`)
}

export async function feedbackAction(fd: FormData) {
  const ctx = await requireWorkspace()
  const rating = Number(fd.get('rating'))
  if (![1, -1].includes(rating)) return
  const message = str(fd, 'message', 64)
  await ctx.sb.from('lois_feedback').insert({
    tenant_id: ctx.ws.tenant_id,
    message_id: message,
    user_id: ctx.user.id,
    rating,
    comment: str(fd, 'comment', 1000) || null,
  })
  await neonLog('feedback', { tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, ref: message, results: rating })
  redirect(`/app?c=${str(fd, 'conversation', 64)}&thanks=1`)
}

export async function escalateAction(fd: FormData) {
  const ctx = await requireWorkspace()
  const conv = str(fd, 'conversation', 64)
  await ctx.sb.from('lois_help_requests').insert({
    tenant_id: ctx.ws.tenant_id,
    user_id: ctx.user.id,
    conversation_id: conv || null,
    message_id: str(fd, 'message', 64) || null,
    question: str(fd, 'question'),
  })
  await neonLog('escalate', { tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, query: str(fd, 'question') })
  redirect('/app/help?sent=1')
}

/* ---------- knowledge base (documents) ---------- */

export async function addDocument(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireWorkspace()
  const title = str(fd, 'title', 200)
  let content = str(fd, 'content', 400000)
  const label = LABELS.includes(str(fd, 'label', 20)) ? str(fd, 'label', 20) : 'reported'
  let sourceType = 'paste'
  let sourceName: string | null = null

  const file = fd.get('file')
  if (file instanceof File && file.size > 0) {
    if (file.size > 1_000_000) return { error: 'Files are limited to 1 MB.' }
    if (!/\.(txt|md|csv|json)$/i.test(file.name)) return { error: 'Upload a .txt, .md, .csv or .json file, or paste the text.' }
    content = (await file.text()).slice(0, 400000)
    sourceType = 'upload'
    sourceName = file.name.slice(0, 200)
  }
  if (!title || !content.trim()) return { error: 'A title and some content are required.' }

  const { data: doc, error } = await ctx.sb
    .from('lois_documents')
    .insert({
      tenant_id: ctx.ws.tenant_id,
      title,
      source_name: sourceName,
      source_type: sourceType,
      evidence_label: label,
      content,
      content_hash: sha256(content),
      created_by: ctx.user.id,
      project_id: str(fd, 'project', 64) || null,
    })
    .select('document_id')
    .single()
  if (error || !doc) return { error: error?.message ?? 'Could not save the document.' }

  const rows = chunkText(content).map((c, i) => ({ tenant_id: ctx.ws.tenant_id, document_id: doc.document_id, ordinal: i, content: c }))
  for (let i = 0; i < rows.length; i += 100) {
    const { error: cErr } = await ctx.sb.from('lois_document_chunks').insert(rows.slice(i, i + 100))
    if (cErr) return { error: `Saved, but indexing failed: ${cErr.message}` }
  }
  await indexEmbeddings(ctx.sb, ctx.ws.tenant_id)
  await neonLog('document', { tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, results: rows.length, ref: doc.document_id })
  await dispatch(ctx.sb, ctx.ws.tenant_id, 'document.added', { document_id: doc.document_id, title, passages: rows.length })
  revalidatePath('/app/knowledge')
  return { ok: true, message: `Added and indexed ${rows.length} passage${rows.length === 1 ? '' : 's'}.` }
}

export async function reindexAction() {
  const ctx = await requireWorkspace()
  const n = await indexEmbeddings(ctx.sb, ctx.ws.tenant_id, 6)
  redirect(`/app/knowledge?indexed=${n}`)
}

export async function archiveDocument(fd: FormData) {
  const ctx = await requireWorkspace()
  await ctx.sb.from('lois_documents').update({ status: 'archived' }).eq('document_id', str(fd, 'id', 64))
  revalidatePath('/app/knowledge')
}

/* ---------- knowledge bank (reviewed, accepted knowledge) ---------- */

export async function submitKnowledge(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireWorkspace()
  const title = str(fd, 'title', 200)
  const content = str(fd, 'content', 20000)
  if (!title || !content) return { error: 'A title and the content are required.' }
  const supersedes = str(fd, 'supersedes', 64) || null
  let version = 1
  if (supersedes) {
    const { data: prev } = await ctx.sb.from('lois_knowledge_items').select('version').eq('knowledge_id', supersedes).maybeSingle()
    version = (prev?.version ?? 0) + 1
  }
  const { error } = await ctx.sb.from('lois_knowledge_items').insert({
    tenant_id: ctx.ws.tenant_id,
    title,
    content,
    domain: str(fd, 'domain', 80) || 'general',
    evidence_label: LABELS.includes(str(fd, 'label', 20)) ? str(fd, 'label', 20) : 'reported',
    status: 'pending_review',
    created_by: ctx.user.id,
    supersedes_id: supersedes,
    version,
    metadata: { via: 'app' },
  })
  if (error) return { error: error.message }
  revalidatePath('/app/bank')
  return { ok: true, message: 'Submitted for review. It becomes searchable once a reviewer accepts it.' }
}

export async function reviewKnowledge(fd: FormData) {
  const ctx = await requireWorkspace()
  const decision = str(fd, 'decision', 20)
  if (!['approved', 'rejected'].includes(decision)) return
  const id = str(fd, 'id', 64)
  const { error } = await ctx.sb.from('lois_knowledge_items').update({ status: decision }).eq('knowledge_id', id).eq('status', 'pending_review')
  if (!error) {
    if (decision === 'approved') await indexEmbeddings(ctx.sb, ctx.ws.tenant_id, 1)
    await neonLog('bank.' + decision, { tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, ref: id })
    await dispatch(ctx.sb, ctx.ws.tenant_id, decision === 'approved' ? 'knowledge.approved' : 'knowledge.rejected', { knowledge_id: id })
  }
  revalidatePath('/app/bank')
  if (error) redirect(`/app/bank?error=${encodeURIComponent(error.message)}`)
}

export async function expireKnowledge(fd: FormData) {
  const ctx = await requireWorkspace()
  await ctx.sb.from('lois_knowledge_items').update({ status: 'expired', valid_until: new Date().toISOString() }).eq('knowledge_id', str(fd, 'id', 64))
  revalidatePath('/app/bank')
}

/* ---------- help requests -> knowledge bank (the relearning loop) ---------- */

export async function resolveHelp(fd: FormData) {
  const ctx = await requireWorkspace()
  const id = str(fd, 'id', 64)
  const resolution = str(fd, 'resolution', 8000)
  if (!resolution) redirect('/app/help?error=empty')
  let itemId: string | null = null
  if (fd.get('promote') === 'on') {
    const { data: item } = await ctx.sb
      .from('lois_knowledge_items')
      .insert({
        tenant_id: ctx.ws.tenant_id,
        title: str(fd, 'question', 200),
        content: resolution,
        domain: 'support',
        evidence_label: 'reported',
        status: 'pending_review',
        created_by: ctx.user.id,
        metadata: { via: 'help_request', help_id: id },
      })
      .select('knowledge_id')
      .single()
    itemId = item?.knowledge_id ?? null
  }
  await ctx.sb
    .from('lois_help_requests')
    .update({ status: 'resolved', resolution, resolved_item_id: itemId, resolved_by: ctx.user.id, resolved_at: new Date().toISOString() })
    .eq('help_id', id)
  await neonLog('help.resolved', { tenant_id: ctx.ws.tenant_id, actor: ctx.user.id, ref: id })
  await dispatch(ctx.sb, ctx.ws.tenant_id, 'help.resolved', { help_id: id, promoted_to_bank: Boolean(itemId) })
  revalidatePath('/app/help')
  redirect('/app/help?resolved=1')
}

/* ---------- projects, profile ---------- */

export async function createProject(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireWorkspace()
  const name = str(fd, 'name', 120)
  if (!name) return { error: 'Give the project a name.' }
  const { error } = await ctx.sb
    .from('lois_projects')
    .insert({ tenant_id: ctx.ws.tenant_id, name, description: str(fd, 'description', 1000) || null, created_by: ctx.user.id })
  if (error) return { error: error.message }
  revalidatePath('/app/projects')
  return { ok: true, message: 'Project created.' }
}

export async function saveProfile(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getCtx()
  const pick = (k: string, allowed: string[], d: string) => (allowed.includes(str(fd, k, 20)) ? str(fd, k, 20) : d)
  const { error } = await ctx.sb.from('lois_profiles').upsert({
    user_id: ctx.user.id,
    display_name: str(fd, 'display_name', 80) || null,
    tone: pick('tone', ['default', 'warm', 'direct', 'short', 'detailed'], 'default'),
    answer_length: pick('answer_length', ['short', 'normal', 'detailed'], 'normal'),
    business: str(fd, 'business', 200) || null,
    interests: str(fd, 'interests', 300) || null,
    goal: str(fd, 'goal', 300) || null,
    leaderboard_opt_in: fd.get('leaderboard_opt_in') === 'on',
  })
  if (error) return { error: error.message }
  return { ok: true, message: 'Saved.' }
}

/* ---------- integrations ---------- */

export async function createApiKey(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireWorkspace()
  if (!ctx.isAdmin) return { error: 'Only owners and admins can create API keys.' }
  const name = str(fd, 'name', 80)
  if (!name) return { error: 'Name the key (for example "n8n production").' }
  const scopes = ['read', ...(fd.get('write') === 'on' ? ['write'] : [])]
  const k = newApiKey()
  const { error } = await ctx.sb
    .from('lois_api_keys')
    .insert({ tenant_id: ctx.ws.tenant_id, name, key_prefix: k.prefix, key_hash: k.hash, scopes, created_by: ctx.user.id })
  if (error) return { error: error.message }
  revalidatePath('/app/integrations')
  return { ok: true, secret: k.key, message: 'Copy this key now. It is shown once and stored only as a hash.' }
}

export async function revokeApiKey(fd: FormData) {
  const ctx = await requireWorkspace()
  await ctx.sb.from('lois_api_keys').update({ revoked_at: new Date().toISOString() }).eq('key_id', str(fd, 'id', 64))
  revalidatePath('/app/integrations')
}

export async function createWebhook(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireWorkspace()
  if (!ctx.isAdmin) return { error: 'Only owners and admins can add webhooks.' }
  const url = str(fd, 'url', 500)
  const name = str(fd, 'name', 80)
  if (!name || !/^https:\/\/\S+$/.test(url)) return { error: 'Give it a name and an https:// URL.' }
  const secret = newSecret()
  const { error } = await ctx.sb
    .from('lois_webhooks')
    .insert({ tenant_id: ctx.ws.tenant_id, name, url, secret, events: ['*'], created_by: ctx.user.id })
  if (error) return { error: error.message }
  revalidatePath('/app/integrations')
  return { ok: true, secret, message: 'Signing secret (shown once):' }
}

export async function deleteWebhook(fd: FormData) {
  const ctx = await requireWorkspace()
  await ctx.sb.from('lois_webhooks').delete().eq('webhook_id', str(fd, 'id', 64))
  revalidatePath('/app/integrations')
}

export async function inviteMember(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await requireWorkspace()
  if (!ctx.isAdmin) return { error: 'Only owners and admins can invite people.' }
  const email = str(fd, 'email', 254).toLowerCase()
  const role = ['admin', 'reviewer', 'member', 'viewer'].includes(str(fd, 'role', 20)) ? str(fd, 'role', 20) : 'member'
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a valid email address.' }
  const { error } = await ctx.sb.from('lois_invitations').insert({ tenant_id: ctx.ws.tenant_id, email, role, invited_by: ctx.user.id })
  if (error) return { error: error.message }
  revalidatePath('/app/team')
  return { ok: true, message: `${email} can now sign in at the login page and will join as ${role}.` }
}

export async function revokeInvite(fd: FormData) {
  const ctx = await requireWorkspace()
  await ctx.sb.from('lois_invitations').delete().eq('invitation_id', str(fd, 'id', 64))
  revalidatePath('/app/team')
}

/* ---------- sandbox (dry run: reads only, writes nothing) ---------- */

export type SandboxResult = {
  ok?: boolean
  error?: string
  query?: string
  hits?: { title: string; kind: string; label: string; score: number; snippet: string }[]
  wouldAnswer?: string
  brief?: { question: string; evidence_count: number; verified_count: number; recommendation: string; execution: 'NO' }
} | null

export async function sandboxRun(_: SandboxResult, fd: FormData): Promise<SandboxResult> {
  const ctx = await requireWorkspace()
  const q = str(fd, 'q', 1000)
  if (!q) return { error: 'Type a scenario or question to test.' }
  try {
    const hits = await retrieve(ctx.sb, ctx.ws.tenant_id, q, 8)
    const verified = hits.filter((h) => h.evidence_label === 'verified').length
    const mode = hits.length ? 'would answer from approved knowledge and bank entries' : 'would reply "no match" and offer a human'
    return {
      ok: true,
      query: q,
      hits: hits.map((h) => ({ title: h.document_title ?? h.title, kind: h.source_kind, label: h.evidence_label, score: Number(h.score.toFixed(3)), snippet: h.snippet.replace(/<\/?b>/g, '') })),
      wouldAnswer: `Assistant ${mode}. Citations: ${citationsOf(hits).length}.`,
      brief: {
        question: q,
        evidence_count: hits.length,
        verified_count: verified,
        recommendation: !hits.length
          ? 'Insufficient evidence. Request a human review before any decision.'
          : verified
            ? 'Evidence available. A person should confirm before acting.'
            : 'Evidence is unverified. Treat as indicative and verify first.',
        execution: 'NO',
      },
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Search failed.' }
  }
}
