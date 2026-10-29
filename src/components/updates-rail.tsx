import Link from 'next/link'
import type { Ctx } from '@/lib/session'
import type { Trial } from '@/lib/trial'
import { todayBriefing } from '@/lib/briefing-data'
import { loadRail } from '@/lib/rail-data'
import { suggest, type Signals } from '@/lib/rail'
import { BriefingView } from './briefing-view'
import { RailShell, ForYou } from './rail-shell'

const KIND: Record<string, string> = { linkedin: 'LinkedIn', framework: 'Framework', system: 'System', ai: 'AI in practice' }
const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0

export async function UpdatesRail({ ctx, trial }: { ctx: Ctx; trial: Trial }) {
  const t0 = ctx.ws!.tenant_id
  const since = new Date(Date.now() - 3 * 864e5).toISOString()
  const [prefs, t, { data: ups }, pendingReview, openHelp, briefs] = await Promise.all([
    loadRail(ctx),
    todayBriefing(ctx),
    ctx.sb.from('lois_updates').select('update_id,kind,title,body,link,created_at').order('created_at', { ascending: false }).limit(4),
    ctx.isReviewer ? count(ctx.sb.from('lois_knowledge_items').select('knowledge_id', { count: 'exact', head: true }).eq('tenant_id', t0).eq('status', 'pending_review')) : Promise.resolve(0),
    count(ctx.sb.from('lois_help_requests').select('help_id', { count: 'exact', head: true }).eq('tenant_id', t0).eq('status', 'open')),
    count(ctx.sb.from('lois_my_briefs').select('brief_id', { count: 'exact', head: true }).eq('user_id', ctx.user.id)),
  ])
  const sig: Signals = {
    isReviewer: ctx.isReviewer, pendingReview, openHelp,
    trialDaysLeft: trial && !trial.ended ? trial.days_left : null, trialEnded: !!trial?.ended,
    briefingReady: !!t?.briefing, newUpdates: (ups ?? []).filter((u) => u.created_at >= since).length, hasBrief: briefs > 0,
  }
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10)
  const items = suggest(sig, prefs.usage, prefs.dismissed, prefs.feedback, today)

  const slots = {
    foryou: <ForYou items={items} />,
    today: (
      <>
        {t?.briefing ? <BriefingView b={t.briefing} compact /> : <p className="muted small">{t?.state === 'early' ? `Briefing at ${t.prefs.send_time.slice(0, 5)}.` : 'No briefing yet.'}</p>}
        <Link className="small" href="/app/briefing">Open briefing and settings</Link>
      </>
    ),
    updates: (
      <>
        {ups?.length ? ups.map((u) => (
          <div key={u.update_id} style={{ marginBottom: '0.8rem' }}>
            <span className="tag mono">{KIND[u.kind] ?? u.kind}</span>
            <p style={{ margin: '0.3rem 0 0' }}><b>{u.title}</b></p>
            <p className="muted small" style={{ margin: 0 }}>{u.body}</p>
            {u.link && <a className="small" href={u.link} target="_blank" rel="noopener noreferrer">Read more</a>}
          </div>
        )) : <p className="muted small">Nothing posted yet. New frameworks, what is working and what people are doing with AI will appear here.</p>}
      </>
    ),
  }
  return <RailShell initial={prefs.layout} slots={slots} />
}
