import type { Ctx } from '@/lib/session'
import { getTrial } from '@/lib/trial'
import { compose, nairobi, scheduleState, DEFAULT_PREFS, type Briefing, type Prefs } from '@/lib/briefing'
import { analyse, parseBrief } from '@/lib/brief'

type Ws = NonNullable<Ctx['ws']>
export type Today = { prefs: Prefs; state: ReturnType<typeof scheduleState>; briefing: Briefing | null; day: string; regen: number }

export async function loadPrefs(ctx: Ctx): Promise<Prefs> {
  const { data } = await ctx.sb.from('lois_brief_prefs').select('enabled,send_time,weekdays,weekend,voice').eq('user_id', ctx.user.id).maybeSingle()
  return data ? { ...DEFAULT_PREFS, ...data, weekdays: (data.weekdays as number[]) ?? DEFAULT_PREFS.weekdays } : DEFAULT_PREFS
}

async function count(q: PromiseLike<{ count: number | null }>) {
  try { return (await q).count ?? 0 } catch { return 0 }
}

async function build(ctx: Ctx, ws: Ws): Promise<Briefing> {
  const t = ws.tenant_id
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const [{ data: prof }, openHelp, pendingBank, flagged, newUpdates, { data: briefs }, { data: acc }, trial] = await Promise.all([
    ctx.sb.from('lois_profiles').select('display_name,tone').eq('user_id', ctx.user.id).maybeSingle(),
    count(ctx.sb.from('lois_help_requests').select('help_id', { count: 'exact', head: true }).eq('tenant_id', t).eq('status', 'open')),
    count(ctx.sb.from('lois_knowledge_items').select('knowledge_id', { count: 'exact', head: true }).eq('tenant_id', t).eq('status', 'pending_review')),
    count(ctx.sb.from('lois_knowledge_items').select('knowledge_id', { count: 'exact', head: true }).eq('tenant_id', t).eq('status', 'pending_review').eq('metadata->>flagged', 'true')),
    count(ctx.sb.from('lois_updates').select('update_id', { count: 'exact', head: true }).gte('created_at', since)),
    ctx.sb.from('lois_my_briefs').select('title,payload,score').eq('user_id', ctx.user.id).order('created_at', { ascending: false }).limit(10),
    ctx.sb.from('lois_access_requests').select('request_id').eq('user_id', ctx.user.id).eq('status', 'pending').limit(1),
    getTrial(ctx.sb, ctx.isInternal),
  ])
  const notReady = (briefs ?? []).flatMap((b) => {
    const p = parseBrief(b.payload)
    if (!p) return []
    const r = analyse(p)
    return r.verdict === 'ready' ? [] : [{ title: String(b.title), score: r.score, message: r.message }]
  })
  return compose({
    name: (prof?.display_name as string) ?? '', tone: (prof?.tone as string) ?? 'default',
    openHelp, pendingBank, flagged, isReviewer: ctx.isReviewer, notReady,
    trialDaysLeft: trial && !ctx.isInternal ? trial.days_left : null, accessPending: (acc ?? []).length > 0, newUpdates,
  })
}

/** Makes today's briefing the first time it is wanted after the person's chosen time. A saved one is reused. */
export async function todayBriefing(ctx: Ctx, force = false): Promise<Today | null> {
  const ws = ctx.ws
  if (!ws) return null
  const prefs = await loadPrefs(ctx)
  const state = scheduleState(prefs)
  const day = nairobi().date
  const { data: saved } = await ctx.sb.from('lois_briefings').select('body,regen').eq('user_id', ctx.user.id).eq('day', day).maybeSingle()
  if (saved && !force) return { prefs, state, briefing: saved.body as Briefing, day, regen: saved.regen as number }
  if (!force && state !== 'due') return { prefs, state, briefing: null, day, regen: 0 }
  const regen = saved ? (saved.regen as number) + 1 : 0
  if (saved && regen > 5) return { prefs, state, briefing: saved.body as Briefing, day, regen: saved.regen as number }
  const briefing = await build(ctx, ws)
  await ctx.sb.from('lois_briefings').upsert({ user_id: ctx.user.id, tenant_id: ws.tenant_id, day, body: briefing, regen }, { onConflict: 'user_id,day' })
  return { prefs, state, briefing, day, regen }
}
