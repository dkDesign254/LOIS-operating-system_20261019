'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

// Second factor for staff: an authenticator app (Google Authenticator, Authy, 1Password...).
export function MfaGate({ hasFactor }: { hasFactor: boolean }) {
  const router = useRouter()
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sb = supabaseBrowser()

  async function start() {
    setBusy(true)
    setError(null)
    if (hasFactor) {
      const { data } = await sb.auth.mfa.listFactors()
      const f = data?.totp?.[0]
      if (!f) setError('No authenticator found. Contact the owner.')
      else setFactorId(f.id)
    } else {
      // Clear half-finished set-ups first so the name does not clash.
      const { data: list } = await sb.auth.mfa.listFactors()
      for (const f of list?.all ?? []) if (f.status === 'unverified') await sb.auth.mfa.unenroll({ factorId: f.id })
      const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'LOIS staff' })
      if (error || !data) setError('Could not start set-up. Check that MFA (TOTP) is enabled in Supabase Authentication.')
      else {
        setFactorId(data.id)
        setQr(data.totp.qr_code)
        setSecret(data.totp.secret)
      }
    }
    setBusy(false)
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setBusy(true)
    setError(null)
    const ch = await sb.auth.mfa.challenge({ factorId })
    if (ch.error) {
      setBusy(false)
      return setError('Could not start the check. Try again.')
    }
    const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code: code.trim() })
    setBusy(false)
    if (v.error) return setError('That code did not work. Codes change every 30 seconds.')
    router.refresh()
  }

  return (
    <div className="card" style={{ maxWidth: 460, margin: '2rem auto' }}>
      <h1 style={{ fontSize: '1.5rem' }}>Staff console</h1>
      <p className="muted">Staff access needs a second step. {hasFactor ? 'Enter the 6-digit code from your authenticator app.' : 'Set up an authenticator app once; after that you only enter a code.'}</p>
      {!factorId && <button className="btn" onClick={start} disabled={busy}>{busy ? 'Working…' : hasFactor ? 'Enter code' : 'Set up authenticator'}</button>}
      {factorId && (
        <form onSubmit={verify}>
          {qr && (
            <div style={{ marginTop: '1rem' }}>
              <p className="small">Scan this with your authenticator app, or type the key:</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Authenticator QR code" width={180} height={180} />
              <p className="small"><code>{secret}</code></p>
            </div>
          )}
          <label htmlFor="c">6-digit code</label>
          <input id="c" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" />
          <div style={{ marginTop: '1rem' }}><button className="btn" disabled={busy}>{busy ? 'Checking…' : 'Verify'}</button></div>
        </form>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </div>
  )
}
