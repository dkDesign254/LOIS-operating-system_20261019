'use server'
import { randomBytes, createHash } from 'node:crypto'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireWorkspace } from '@/lib/session'
import { bySlug } from '@/lib/use-cases'
import { buildRecord, simulate } from '@/lib/run-record'
import { allowed } from '@/lib/webhooks'
import { SITE_URL } from '@/lib/site'

const back = (slug: string, q: string) => redirect(`/app/sandbox/hub/${slug}?${q}`)
const msg = (e: unknown) => (e && typeof e === 'object' && 'message' in e ? String((e as { message: string }).message) : 'Something went wrong')

function readConfig(u: NonNullable<ReturnType<typeof bySlug>>, fd: FormData) {
  const mode = fd.get('config_mode') === 'custom' ? 'custom' : 'standard'
  const config: Record<string, string | number> = { ...u.standard_config }
  if (mode === 'custom') for (const f of u.config_fields) {
    const raw = String(fd.get('c_' + f.key) ?? '').trim().slice(0, 300)
    if (!raw) continue
    if (f.type === 'number') { const n = Number(raw); if (Number.isFinite(n) && n >= 0 && n < 100000) config[f.key] = n } else if (f.type === 'select') { if (f.options?.includes(raw)) config[f.key] = raw } else config[f.key] = raw
  }
  const input: Record<string, string> = {}
  for (const f of u.inputs) input[f.key] = String(fd.get('i_' + f.key) ?? '').trim().slice(0, 400)
  return { mode: mode as 'standard' | 'custom', config, input }
}

async function useCaseId(ctx: Awaited<ReturnType<typeof requireWorkspace>>, slug: string) {
  const { data } = await ctx.sb.from('lois_use_cases').select('use_case_id').eq('slug', slug).maybeSingle()
  return data?.use_case_id as string | undefined
}

export async function saveConfig(fd: FormData) {
  const ctx = await requireWorkspace()
  const slug = String(fd.get('slug') ?? ''); const u = bySlug(slug); if (!u) redirect('/app/sandbox/hub')
  const id = await useCaseId(ctx, slug); if (!id) back(slug, 'error=' + encodeURIComponent('This use case is not set up in the database yet.'))
  const { mode, config } = readConfig(u, fd)
  const { error } = await ctx.sb.from('lois_use_case_configs').upsert({ tenant_id: ctx.ws.tenant_id, use_case_id: id, mode, config, updated_by: ctx.user.id, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,use_case_id' })
  if (error) back(slug, 'error=' + encodeURIComponent(msg(error)))
  revalidatePath('/app/sandbox/hub/' + slug)
  back(slug, 'saved=1')
}

/** A test run: nothing leaves LOIS. The record explains what, when, why, how, what to expect and how accurate it is. */
export async function runTest(fd: FormData) {
  const ctx = await requireWorkspace()
  const slug = String(fd.get('slug') ?? ''); const u = bySlug(slug); if (!u) redirect('/app/sandbox/hub')
  const id = await useCaseId(ctx, slug); if (!id) back(slug, 'error=' + encodeURIComponent('Not set up in the database yet.'))
  const { mode, config, input } = readConfig(u, fd)
  const why = String(fd.get('why') ?? '').trim().slice(0, 300)
  const record = { ...buildRecord(u, 'test', mode, config, input, why), simulation: simulate(u, input) }
  const { data, error } = await ctx.sb.from('lois_runs').insert({ tenant_id: ctx.ws.tenant_id, user_id: ctx.user.id, use_case_id: id, mode: 'test', status: 'simulated', config_mode: mode, why, input, record }).select('run_id').single()
  if (error || !data) back(slug, 'error=' + encodeURIComponent(error?.message.includes('allowance') ? error.message : 'Could not start the test run. ' + msg(error)))
  revalidatePath('/app/sandbox/hub/' + slug)
  redirect(`/app/sandbox/hub/runs?run=${data!.run_id}`)
}

/** A live request: needs an enabled connector, a reason, and then a different person's approval before anything is sent. */
export async function requestLive(fd: FormData) {
  const ctx = await requireWorkspace()
  const slug = String(fd.get('slug') ?? ''); const u = bySlug(slug); if (!u) redirect('/app/sandbox/hub')
  const id = await useCaseId(ctx, slug); if (!id) back(slug, 'error=' + encodeURIComponent('Not set up in the database yet.'))
  const why = String(fd.get('why') ?? '').trim().slice(0, 300)
  if (why.length < 10) back(slug, 'error=' + encodeURIComponent('Say why you are running this for real (10+ characters).'))
  const { data: cons } = await ctx.sb.from('lois_connectors').select('connector_id,label').eq('tenant_id', ctx.ws.tenant_id).eq('enabled', true).limit(1)
  const con = cons?.[0]
  if (!con) back(slug, 'error=' + encodeURIComponent('No connector is switched on. An owner or admin switches one on under Connectors, with a reason.'))
  const { mode, config, input } = readConfig(u, fd)
  const record = buildRecord(u, 'live', mode, config, input, why)
  const { data, error } = await ctx.sb.from('lois_runs').insert({ tenant_id: ctx.ws.tenant_id, user_id: ctx.user.id, use_case_id: id, mode: 'live', status: 'awaiting_approval', connector_id: con!.connector_id, config_mode: mode, why, input, record: { ...record, config } }).select('run_id').single()
  if (error || !data) back(slug, 'error=' + encodeURIComponent(error?.message.includes('allowance') ? error.message : 'Could not create the live request. ' + msg(error)))
  revalidatePath('/app/sandbox/hub/runs')
  redirect(`/app/sandbox/hub/runs?run=${data!.run_id}&requested=1`)
}

/** Approve or reject a live run. A different person must decide. On approval the run is sent to the connector with a one-time return token. */
export async function decideRun(fd: FormData) {
  const ctx = await requireWorkspace()
  const run = String(fd.get('run') ?? '').slice(0, 64)
  const approve = fd.get('decision') === 'approve'
  const note = String(fd.get('note') ?? '').trim().slice(0, 300)
  const { data: res, error } = await ctx.sb.rpc('lois_run_decide', { p_run: run, p_approve: approve, p_note: note })
  if (error) redirect(`/app/sandbox/hub/runs?run=${run}&error=` + encodeURIComponent(msg(error).replace(/^.*?: /, '')))
  if (res === 'sent') await sendRun(ctx, run)
  revalidatePath('/app/sandbox/hub/runs')
  redirect(`/app/sandbox/hub/runs?run=${run}&done=${approve ? 'approved' : 'rejected'}`)
}

async function sendRun(ctx: Awaited<ReturnType<typeof requireWorkspace>>, run: string) {
  const { data: r } = await ctx.sb.from('lois_runs').select('run_id,connector_id,input,record,use_case_id,approval_note').eq('run_id', run).single()
  const { data: uc } = r ? await ctx.sb.from('lois_use_cases').select('slug').eq('use_case_id', r.use_case_id).single() : { data: null }
  const fail = async (e: string) => { await ctx.sb.rpc('lois_run_finish', { p_run: run, p_status: 'failed', p_result: null, p_error: e, p_callback_hash: null }) }
  if (!r || !r.connector_id) return fail('No connector was attached to this run.')
  const { data: endpoint } = await ctx.sb.rpc('lois_connector_endpoint', { p_connector: r.connector_id })
  if (!endpoint || !allowed(String(endpoint))) return fail('The connector is switched off or its address is not allowed.')
  const token = randomBytes(24).toString('hex')
  const hash = createHash('sha256').update(token).digest('hex')
  await ctx.sb.rpc('lois_run_finish', { p_run: run, p_status: 'sent', p_result: null, p_error: null, p_callback_hash: hash })
  try {
    const res = await fetch(String(endpoint), {
      method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'LOIS-Connector/1.0' }, signal: AbortSignal.timeout(15000), redirect: 'error',
      body: JSON.stringify({ run_id: run, use_case: uc?.slug, input: r.input, config: (r.record as { config?: unknown })?.config ?? {}, approval_note: r.approval_note, callback_url: `${SITE_URL}/api/v1/run-callback`, callback_token: token }),
    })
    if (!res.ok) await ctx.sb.rpc('lois_run_finish', { p_run: run, p_status: 'failed', p_result: null, p_error: `The connector answered ${res.status}.`, p_callback_hash: hash })
  } catch (e) {
    await ctx.sb.rpc('lois_run_finish', { p_run: run, p_status: 'failed', p_result: null, p_error: e instanceof Error ? e.message.slice(0, 200) : 'The connector could not be reached.', p_callback_hash: hash })
  }
}

/** Record the outcome by hand when the connector cannot post it back, or after checking it. */
export async function recordResult(fd: FormData) {
  const ctx = await requireWorkspace()
  const run = String(fd.get('run') ?? '').slice(0, 64)
  const text = String(fd.get('text') ?? '').trim().slice(0, 2000)
  if (text.length < 5) redirect(`/app/sandbox/hub/runs?run=${run}&error=` + encodeURIComponent('Describe what happened (5+ characters).'))
  const { error } = await ctx.sb.rpc('lois_run_finish', { p_run: run, p_status: 'succeeded', p_result: { entered_by: ctx.user.email, text, label: 'verified by a person' }, p_error: null, p_callback_hash: null })
  if (error) redirect(`/app/sandbox/hub/runs?run=${run}&error=` + encodeURIComponent(msg(error)))
  revalidatePath('/app/sandbox/hub/runs')
  redirect(`/app/sandbox/hub/runs?run=${run}&done=recorded`)
}

/** Proposes what a run taught to the Knowledge bank. It waits for review like everything else. */
export async function proposeLearning(fd: FormData) {
  const ctx = await requireWorkspace()
  const run = String(fd.get('run') ?? '').slice(0, 64)
  const title = String(fd.get('title') ?? '').trim().slice(0, 200)
  const content = String(fd.get('content') ?? '').trim().slice(0, 4000)
  if (title.length < 5 || content.length < 20) redirect(`/app/sandbox/hub/runs?run=${run}&error=` + encodeURIComponent('Write a title and what you learned (20+ characters).'))
  await ctx.sb.from('lois_knowledge_items').insert({ tenant_id: ctx.ws.tenant_id, title, content, domain: 'use_case_learning', evidence_label: 'reported', status: 'pending_review', created_by: ctx.user.id, metadata: { via: 'use_case_run', run_id: run, note: 'Written by a person after a run; not yet reviewed.' } })
  revalidatePath('/app/bank')
  redirect(`/app/sandbox/hub/runs?run=${run}&done=proposed`)
}
