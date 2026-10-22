'use client'
import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { QUESTIONS } from '@/lib/policy'
import { completeOnboarding } from './actions'

type A = Record<string, string>

export function Assessment({ email }: { email: string }) {
  const [answers, setAnswers] = useState<A>({})
  const [step, setStep] = useState(0)
  const [source, setSource] = useState<'app' | 'landing'>('app')
  const [state, run, pending] = useActionState(completeOnboarding, null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('lois_assess')
      if (raw) {
        const a = JSON.parse(raw) as A
        if (a.intent && a.audience && a.org_type) {
          setAnswers(a)
          setStep(3)
          setSource('landing')
        }
      }
    } catch {}
  }, [])

  const q = QUESTIONS[step]
  function pick(v: string) {
    setAnswers((cur) => ({ ...cur, [q.key]: v }))
    setStep((s) => s + 1)
  }

  return (
    <div className="authwrap">
      <div className="card">
        <span className="brand" style={{ color: 'var(--navy)' }}><i /> LOIS</span>
        <div className="dots" aria-hidden>
          {[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}
        </div>

        {step < 3 && q && (
          <div>
            <p className="muted small">Question {step + 1} of 3</p>
            <h1 style={{ fontSize: '1.4rem' }}>{q.title}</h1>
            {q.options.map((o) => (
              <button key={o.v} type="button" className="choice" aria-pressed={answers[q.key] === o.v} onClick={() => pick(o.v)}>{o.label}</button>
            ))}
            {step > 0 && <p className="small"><button type="button" className="linkbtn" onClick={() => setStep(step - 1)}>Back</button></p>}
          </div>
        )}

        {step === 3 && (
          <form action={run}>
            <h1 style={{ fontSize: '1.4rem' }}>Almost there</h1>
            <p className="muted">Signed in as <b>{email}</b>. We use your three answers only to point you to the right place first.</p>
            {Object.entries(answers).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
            <input type="hidden" name="source" value={source} />
            <label className="row" style={{ alignItems: 'flex-start', marginTop: '1rem', gap: '0.6rem', fontWeight: 400 }}>
              <input type="checkbox" name="terms" required style={{ width: 'auto', marginTop: '0.25rem' }} />
              <span className="small">I have read the <Link href="/privacy" target="_blank">privacy notice</Link> and agree to LOIS storing my account details and these answers for the purposes described there.</span>
            </label>
            <label className="row" style={{ alignItems: 'flex-start', marginTop: '0.5rem', gap: '0.6rem', fontWeight: 400 }}>
              <input type="checkbox" name="updates" style={{ width: 'auto', marginTop: '0.25rem' }} />
              <span className="small">Optional: send me occasional product updates. I can withdraw this any time in Privacy.</span>
            </label>
            <div className="row" style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={pending}>{pending ? 'Saving…' : 'Continue to LOIS'}</button>
              <button type="button" className="btn ghost" onClick={() => setStep(2)}>Change answers</button>
            </div>
            {state?.error && <p className="err" role="alert">{state.error}</p>}
          </form>
        )}
      </div>
    </div>
  )
}
