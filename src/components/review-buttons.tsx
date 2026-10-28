'use client'
import { useActionState } from 'react'
import { reviewKnowledge } from '@/app/app/actions'

export function ReviewButtons({ id }: { id: string }) {
  const [state, run, pending] = useActionState(reviewKnowledge, null)
  if (state?.ok) return <span className="ok" role="status">{state.message}</span>
  return (
    <form action={run} className="row" style={{ gap: '0.5rem' }}>
      <input type="hidden" name="id" value={id} />
      <button className="btn" name="decision" value="approved" disabled={pending}>{pending ? 'Saving…' : 'Accept'}</button>
      <button className="btn ghost" name="decision" value="rejected" disabled={pending}>Reject</button>
      {state?.error && <span className="err" role="alert">{state.error}</span>}
    </form>
  )
}
