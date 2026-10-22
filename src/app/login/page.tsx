'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/policy'

const OAUTH = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? '').split(',').map((s) => s.trim()).filter(Boolean) as ('google' | 'github')[]

function safeNext(n: string | null) {
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/app'
}

type Mode = 'signin' | 'signup' | 'code' | 'forgot'

function Form() {
  const router = useRouter()
  const params = useSearchParams()
  const next = safeNext(params.get('next'))
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(params.get('error') ? 'That link did not work or has expired. Request a new one.' : null)
  const [note, setNote] = useState<string | null>(null)

  const cleanEmail = () => email.trim().toLowerCase()
  const redirectTo = (to: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(to)}`
  function reset(m: Mode) {
    setMode(m)
    setError(null)
    setNote(null)
    setCodeSent(false)
  }
  async function wrap(fn: () => Promise<string | null | void>) {
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const msg = await fn()
      if (msg) setError(msg)
    } catch {
      setError('Something went wrong. Please try again.')
    }
    setBusy(false)
  }
  const done = () => {
    router.replace(next)
    router.refresh()
  }

  const signIn = (e: React.FormEvent) => {
    e.preventDefault()
    return wrap(async () => {
      const { error } = await supabaseBrowser().auth.signInWithPassword({ email: cleanEmail(), password })
      if (error) return friendlyAuthError(error.message)
      done()
    })
  }
  const signUp = (e: React.FormEvent) => {
    e.preventDefault()
    return wrap(async () => {
      if (password.length < 10) return 'Choose a password of at least 10 characters.'
      const { data, error } = await supabaseBrowser().auth.signUp({ email: cleanEmail(), password, options: { emailRedirectTo: redirectTo(next) } })
      if (error) return friendlyAuthError(error.message)
      if (data.session) return done()
      setNote(`We sent a confirmation link to ${cleanEmail()}. Open it and you are in.`)
    })
  }
  const sendCode = (e: React.FormEvent) => {
    e.preventDefault()
    return wrap(async () => {
      const { error } = await supabaseBrowser().auth.signInWithOtp({ email: cleanEmail(), options: { emailRedirectTo: redirectTo(next) } })
      if (error) return friendlyAuthError(error.message)
      setCodeSent(true)
    })
  }
  const verify = (e: React.FormEvent) => {
    e.preventDefault()
    return wrap(async () => {
      const { error } = await supabaseBrowser().auth.verifyOtp({ email: cleanEmail(), token: code.trim(), type: 'email' })
      if (error) return 'That code did not work. Check it or request a new one.'
      done()
    })
  }
  const forgot = (e: React.FormEvent) => {
    e.preventDefault()
    return wrap(async () => {
      const { error } = await supabaseBrowser().auth.resetPasswordForEmail(cleanEmail(), { redirectTo: redirectTo('/auth/update-password') })
      if (error) return friendlyAuthError(error.message)
      // Same message whether or not the email exists, so accounts cannot be probed.
      setNote('If that email has an account, a reset link is on its way.')
    })
  }
  const oauth = (provider: 'google' | 'github') =>
    supabaseBrowser().auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo(next) } })

  const title = { signin: 'Welcome back', signup: 'Create your account', code: 'Email me a code', forgot: 'Reset your password' }[mode]

  return (
    <div className="authwrap">
      <div className="card">
        <Link href="/" className="brand" style={{ color: 'var(--navy)' }}>
          <i /> LOIS
        </Link>
        <h1 style={{ marginTop: '1rem', fontSize: '1.6rem' }}>{title}</h1>

        {(mode === 'signin' || mode === 'signup') && OAUTH.length > 0 && (
          <>
            <div className="stack" style={{ marginTop: '0.75rem' }}>
              {OAUTH.map((p) => (
                <button key={p} type="button" className="btn ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => oauth(p)}>
                  Continue with {p === 'google' ? 'Google' : 'GitHub'}
                </button>
              ))}
            </div>
            <p className="muted small" style={{ textAlign: 'center', margin: '0.75rem 0 0' }}>or use your email</p>
          </>
        )}

        {mode === 'signin' && (
          <form onSubmit={signIn}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <label htmlFor="pw">Password</label>
            <input id="pw" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
            </div>
            <p className="small" style={{ marginTop: '0.75rem' }}>
              <button type="button" className="linkbtn" onClick={() => reset('forgot')}>Forgot password?</button> · <button type="button" className="linkbtn" onClick={() => reset('code')}>Email me a code instead</button>
            </p>
            <p className="muted small">New here? <button type="button" className="linkbtn" onClick={() => reset('signup')}>Create an account</button></p>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={signUp}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <label htmlFor="pw">Password (at least 10 characters)</label>
            <input id="pw" type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>
            </div>
            <p className="muted small" style={{ marginTop: '0.75rem' }}>
              You will review our <Link href="/privacy" target="_blank">privacy notice</Link> and give your consent on the next screen.
            </p>
            <p className="muted small">Already have an account? <button type="button" className="linkbtn" onClick={() => reset('signin')}>Sign in</button></p>
          </form>
        )}

        {mode === 'code' && !codeSent && (
          <form onSubmit={sendCode}>
            <p className="muted">We&apos;ll email you a one-time code. It works for new and existing accounts.</p>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
            </div>
            <p className="small"><button type="button" className="linkbtn" onClick={() => reset('signin')}>Back</button></p>
          </form>
        )}

        {mode === 'code' && codeSent && (
          <form onSubmit={verify}>
            <p className="muted">We sent a code to <b>{cleanEmail()}</b>. Enter it, or click the link in the email.</p>
            <label htmlFor="code">One-time code</label>
            <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
            <div className="row" style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
              <button type="button" className="btn ghost" onClick={() => reset('code')}>Use a different email</button>
            </div>
          </form>
        )}

        {mode === 'forgot' && (
          <form onSubmit={forgot}>
            <p className="muted">Enter your email and we&apos;ll send a link to choose a new password.</p>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <div style={{ marginTop: '1rem' }}>
              <button className="btn" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
            </div>
            <p className="small"><button type="button" className="linkbtn" onClick={() => reset('signin')}>Back to sign in</button></p>
          </form>
        )}

        {error && <p className="err" role="alert">{error}</p>}
        {note && <p className="ok" role="status">{note}</p>}
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
