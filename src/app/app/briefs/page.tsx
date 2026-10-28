import { getCtx } from '@/lib/session'
import { BriefBuilder } from '@/components/brief-builder'
import { saveMyBrief, deleteMyBrief } from './actions'

export const metadata = { title: 'Decision briefs' }
export const dynamic = 'force-dynamic'

export default async function Briefs() {
  const ctx = await getCtx()
  const { data } = await ctx.sb.from('lois_my_briefs').select('brief_id,title,score,created_at').eq('user_id', ctx.user.id).order('created_at', { ascending: false }).limit(30)
  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <div>
        <h1>Decision briefs</h1>
        <p className="muted">The heart of LOIS: before anyone decides, see what is clear, what is missing and who should approve.</p>
      </div>
      <BriefBuilder mode="member" save={saveMyBrief} />
      <div className="card">
        <h2>Saved briefs</h2>
        {data?.length ? (
          <ul className="plainlist">
            {data.map((d) => (
              <li key={d.brief_id} className="row" style={{ justifyContent: 'space-between', padding: '0.5rem 0' }}>
                <span><b>{d.title}</b><br /><span className="muted small">Score {d.score} · {new Date(d.created_at).toLocaleDateString('en-GB')}</span></span>
                <form action={deleteMyBrief}><input type="hidden" name="id" value={d.brief_id} /><button className="btn ghost small">Delete</button></form>
              </li>
            ))}
          </ul>
        ) : <p className="muted">Nothing saved yet.</p>}
      </div>
    </div>
  )
}
