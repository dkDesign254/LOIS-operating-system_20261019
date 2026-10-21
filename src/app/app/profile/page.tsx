import { getCtx } from '@/lib/session'
import { ActionForm } from '@/components/forms'
import { saveProfile } from '../actions'

export const metadata = { title: 'Profile' }

export default async function Profile() {
  const ctx = await getCtx()
  const { data: p } = await ctx.sb.from('lois_profiles').select('*').eq('user_id', ctx.user.id).maybeSingle()
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div>
        <h1>Profile &amp; preferences</h1>
        <p className="muted">These shape how the assistant talks to you. Only you can see them.</p>
      </div>
      <div className="card">
        <ActionForm action={saveProfile} submit="Save">
          <div className="field">
            <label htmlFor="display_name">Name</label>
            <input id="display_name" name="display_name" type="text" maxLength={80} defaultValue={p?.display_name ?? ''} />
          </div>
          <div className="grid two" style={{ marginTop: '0.85rem' }}>
            <div>
              <label htmlFor="tone">Tone</label>
              <select id="tone" name="tone" defaultValue={p?.tone ?? 'default'}>
                <option value="default">Default</option>
                <option value="warm">Warm</option>
                <option value="direct">Direct</option>
                <option value="short">Brief</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
            <div>
              <label htmlFor="answer_length">Answer length</label>
              <select id="answer_length" name="answer_length" defaultValue={p?.answer_length ?? 'normal'}>
                <option value="short">Short</option>
                <option value="normal">Normal</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="business">Business</label>
            <input id="business" name="business" type="text" maxLength={200} defaultValue={p?.business ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="interests">Interests</label>
            <input id="interests" name="interests" type="text" maxLength={300} defaultValue={p?.interests ?? ''} />
          </div>
          <div className="field">
            <label htmlFor="goal">Goal</label>
            <input id="goal" name="goal" type="text" maxLength={300} defaultValue={p?.goal ?? ''} />
          </div>
          <label className="row" style={{ fontWeight: 400, marginTop: '1rem' }}>
            <input type="checkbox" name="leaderboard_opt_in" defaultChecked={p?.leaderboard_opt_in ?? false} /> Show me on the leaderboard
          </label>
        </ActionForm>
      </div>
    </div>
  )
}
