'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase/client'

const OAUTH = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? '').split(',').map((s) => s.trim()).filter(Boolean) as ('google' | 'github')[]

function safeNext(n: string | null) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/app'
}

function Form() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(params.get('error') ? 'That sign-in link did not work. Request a new one.' : null)

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    })
    setBusy(false)
    if (error) setError(error.message)
    else setStep('code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabaseBrowser().auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setError('That code did not work. Check it or request a new one.')
    else {
      router.replace(next)
      router.refresh()
    }
  }

  async function oauth(provider: 'google' | 'github') {
    await supabaseBrowser().auth.signInWithOAuth({ provider, options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` } })
  }

  return (
    <div className="authwrap">
      <div className="card">
        <Link href="/" className="brand" style={{ color: 'var(--navy)' }}>
          <i /> LOIS
        </Link>
        <h1 style={{ marginTop: '1rem', fontSize: '1.6rem' }}>Sign in</h1>
        {step === 'email' ? (
          <form onSubmit={send}>
            <p className="muted">We&apos;ll email you a one-time code. No password to remember.</p>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Sending…' : 'Email me a code'}
              </button>
            </div>
            {OAUTH.length > 0 && (
              <div className="stack" style={{ marginTop: '1.25rem' }}>
                {OAUTH.map((p) => (
                  <button key={p} type="button" className="btn ghost" onClick={() => oauth(p)}>
                    Continue with {p === 'google' ? 'Google' : 'GitHub'}
                  </button>
                ))}
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={verify}>
            <p className="muted">
              We sent a code to <b>{email}</b>. Enter it below, or click the link in the email.
            </p>
            <label htmlFor="code">One-time code</label>
            <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            <div className="row" style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={busy}>
                {busy ? 'Checking…' : 'Sign in'}
              </button>
              <button type="button" className="btn ghost" onClick={() => setStep('email')}>
                Use a different email
              </button>
            </div>
          </form>
        )}
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

export default function Login() {
  return (
    <Suspense>
      <Form />
    </Suspense>
  )
}
