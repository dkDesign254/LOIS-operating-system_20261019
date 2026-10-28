import Link from 'next/link'
import type { Ctx } from '@/lib/session'
import { todayBriefing } from '@/lib/briefing-data'
import { BriefingView } from './briefing-view'

const KIND: Record<string, string> = { linkedin: 'LinkedIn', framework: 'Framework', system: 'System', ai: 'AI in practice' }

export async function UpdatesRail({ ctx }: { ctx: Ctx }) {
  const [t, { data: ups }] = await Promise.all([
    todayBriefing(ctx),
    ctx.sb.from('lois_updates').select('update_id,kind,title,body,link,created_at').order('created_at', { ascending: false }).limit(4),
  ])
  return (
    <aside className="rail" aria-label="Today and updates">
      <section className="rail-card">
        <p className="marker mono">§ TODAY</p>
        {t?.briefing ? <BriefingView b={t.briefing} compact /> : <p className="muted small">{t?.state === 'early' ? `Briefing at ${t.prefs.send_time.slice(0, 5)}.` : 'No briefing yet.'}</p>}
        <Link className="small" href="/app/briefing">Open briefing and settings</Link>
      </section>
      <section className="rail-card">
        <p className="marker mono">§ UPDATES</p>
        {ups?.length ? ups.map((u) => (
          <div key={u.update_id} style={{ marginBottom: '0.8rem' }}>
            <span className="tag mono">{KIND[u.kind] ?? u.kind}</span>
            <p style={{ margin: '0.3rem 0 0' }}><b>{u.title}</b></p>
            <p className="muted small" style={{ margin: 0 }}>{u.body}</p>
            {u.link && <a className="small" href={u.link} target="_blank" rel="noopener noreferrer">Read more</a>}
          </div>
        )) : <p className="muted small">Nothing posted yet. New frameworks, what is working and what people are doing with AI will appear here.</p>}
      </section>
    </aside>
  )
}
