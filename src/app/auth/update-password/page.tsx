'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase/client'
import { friendlyAuthError } from '@/lib/policy'

export default function UpdatePassword() {
  const router = useRouter()
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (pw.length < 10) return setError('Choose a password of at least 10 characters.')
    setBusy(true)
    setError(null)
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return setError(error.message.toLowerCase().includes('session') ? 'This reset link has expired. Request a new one from the sign-in page.' : friendlyAuthError(error.message))
    router.replace('/app')
    router.refresh()
  }

  return (
    <div className="authwrap">
      <div className="card">
        <Link href="/" className="brand" style={{ color: 'var(--navy)' }}><i /> LOIS</Link>
        <h1 style={{ marginTop: '1rem', fontSize: '1.6rem' }}>Choose a new password</h1>
        <form onSubmit={save}>
          <label htmlFor="pw">New password (at least 10 characters)</label>
          <input id="pw" type="password" required minLength={10} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <div style={{ marginTop: '1rem' }}><button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button></div>
        </form>
        {error && <p className="err" role="alert">{error}</p>}
      </div>
    </div>
  )
}
