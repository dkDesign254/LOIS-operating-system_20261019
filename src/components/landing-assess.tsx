'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { QUESTIONS } from '@/lib/policy'

// Three quick questions on the homepage. Answers stay in this browser tab until the person signs in and consents.
export function LandingAssess() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [a, setA] = useState<Record<string, string>>({})
  const q = QUESTIONS[step]
  function pick(v: string) {
    const next = { ...a, [q.key]: v }
    setA(next)
    if (step < 2) return setStep(step + 1)
    try { sessionStorage.setItem('lois_assess', JSON.stringify(next)) } catch {}
    router.push('/login?mode=signup')
  }
  return (
    <div className="card" style={{ maxWidth: 520, margin: '0 auto', textAlign: 'left' }}>
      <p className="muted small">Question {step + 1} of 3 · nothing is saved until you create an account</p>
      <h2 style={{ marginTop: 0 }}>{q.title}</h2>
      {q.options.map((o) => <button key={o.v} type="button" className="choice" onClick={() => pick(o.v)}>{o.label}</button>)}
      {step > 0 && <p className="small"><button type="button" className="linkbtn" onClick={() => setStep(step - 1)}>Back</button></p>}
    </div>
  )
}
