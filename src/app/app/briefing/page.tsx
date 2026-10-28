import { requireWorkspace } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { BriefingView } from '@/components/briefing-view'
import { todayBriefing } from '@/lib/briefing-data'
import { savePrefs, briefNow } from './actions'

export const metadata = { title: 'Daily briefing' }
export const dynamic = 'force-dynamic'

const DAYS = [['d1', 'Mon', 1], ['d2', 'Tue', 2], ['d3', 'Wed', 3], ['d4', 'Thu', 4], ['d5', 'Fri', 5]] as const

export default async function Briefing() {
  const ctx = await requireWorkspace()
  const t = await todayBriefing(ctx)
  const p = t!.prefs
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div>
        <h1>Daily briefing</h1>
        <p className="muted">What needs you today, from your own workspace. Every line says where it came from. No AI model writes it, so nothing is made up.</p>
      </div>
      <section className="card stack">
        <p className="marker mono">§ TODAY</p>
        {t!.briefing ? <BriefingView b={t!.briefing} /> : (
          <p className="muted">
            {t!.state === 'early' ? `Your briefing is ready at ${p.send_time.slice(0, 5)} Nairobi time.` : t!.state === 'ask_weekend' ? 'It is the weekend. Want a briefing anyway?' : 'Briefings are off for today.'}
          </p>
        )}
        <form action={briefNow}><button className="btn ghost small">{t!.briefing ? 'Refresh now' : 'Brief me now'}</button> <span className="muted small">Up to six a day.</span></form>
      </section>
      <section className="card">
        <h2>When and how</h2>
        <ActionForm action={savePrefs} submit="Save">
          <label className="row" style={{ fontWeight: 400 }}><input type="checkbox" name="enabled" defaultChecked={p.enabled} /> Give me a daily briefing</label>
          <div className="field"><label htmlFor="send_time">Time (Nairobi)</label><input id="send_time" name="send_time" type="time" defaultValue={p.send_time.slice(0, 5)} required /></div>
          <fieldset style={{ border: 0, padding: 0 }}><legend style={{ fontWeight: 600 }}>Weekdays</legend>
            <div className="row" style={{ flexWrap: 'wrap' }}>{DAYS.map(([k, l, n]) => <label key={k} className="row" style={{ fontWeight: 400 }}><input type="checkbox" name={k} defaultChecked={p.weekdays.includes(n)} /> {l}</label>)}</div>
          </fieldset>
          <div className="field"><label htmlFor="weekend">Weekends</label>
            <select id="weekend" name="weekend" defaultValue={p.weekend}>
              <option value="off">Leave me alone</option><option value="ask">Ask me first</option><option value="on">Brief me automatically</option>
            </select></div>
          <label className="row" style={{ fontWeight: 400 }}><input type="checkbox" name="voice" defaultChecked={p.voice} /> I prefer to listen (shows the Listen button first)</label>
        </ActionForm>
        <p className="muted small">Your briefing is prepared the first time you open LOIS after this time, because free hosting cannot wake the app at an exact minute.</p>
      </section>
    </div>
  )
}
