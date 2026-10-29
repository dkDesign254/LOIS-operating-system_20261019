'use client'
import { useActionState, useRef } from 'react'
import { reviewKnowledge } from '@/app/app/actions'

export function ReviewButtons({ id }: { id: string }) {
  const [state, run, pending] = useActionState(reviewKnowledge, null)
  const decision = useRef<HTMLInputElement>(null)
  // The chosen button is written into a hidden field first, so the decision always travels with the form.
  const pick = (d: string) => () => { if (decision.current) decision.current.value = d }
  if (state?.ok) return <span className="ok" role="status">{state.message}</span>
  return (
    <form action={run} className="row" style={{ gap: '0.5rem' }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" ref={decision} defaultValue="" />
      <button type="submit" className="btn" onClick={pick('approved')} disabled={pending}>{pending ? 'Saving…' : 'Accept'}</button>
      <button type="submit" className="btn ghost" onClick={pick('rejected')} disabled={pending}>Reject</button>
      {state?.error && <span className="err" role="alert">{state.error}</span>}
    </form>
  )
}
