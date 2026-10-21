import { randomUUID } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

type Target = { webhook_id: string; url: string; signature: string }

/** Blocks obvious internal targets. Webhook URLs are admin-supplied and fetched server-side. */
function allowed(raw: string): boolean {
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return false
    const h = u.hostname.toLowerCase()
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return false
    if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
      const [a, b] = h.split('.').map(Number)
      if (a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return false
    }
    if (h.includes(':')) return false // IPv6 literals
    return true
  } catch {
    return false
  }
}

/**
 * Sends a signed event to every enabled webhook subscribed to it.
 * The database computes the HMAC signature, so secrets never leave it unsigned.
 * Best-effort: failures are logged to lois_webhook_deliveries, never thrown.
 */
export async function dispatch(sb: SupabaseClient, tenant: string, event: string, data: Record<string, unknown>) {
  try {
    const ts = Math.floor(Date.now() / 1000)
    const body = JSON.stringify({ id: randomUUID(), api_version: '1', type: event, created: ts, tenant_id: tenant, data })
    const { data: targets } = await sb.rpc('lois_webhook_prepare', { p_tenant: tenant, p_event: event, p_body: body, p_ts: ts })
    await Promise.allSettled(
      ((targets ?? []) as Target[]).map(async (t) => {
        let status: number | null = null
        let ok = false
        let error: string | null = null
        if (!allowed(t.url)) error = 'blocked target'
        else {
          try {
            const res = await fetch(t.url, {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'LOIS-Event': event, 'LOIS-Signature': t.signature, 'user-agent': 'LOIS-Webhooks/1' },
              body,
              redirect: 'manual',
              signal: AbortSignal.timeout(5000),
            })
            status = res.status
            ok = res.ok
          } catch (e) {
            error = e instanceof Error ? e.message.slice(0, 200) : 'request failed'
          }
        }
        await sb.rpc('lois_webhook_log', { p_tenant: tenant, p_webhook: t.webhook_id, p_event: event, p_status: status, p_ok: ok, p_error: error })
      }),
    )
  } catch {
    // never block the user action on a webhook problem
  }
}
