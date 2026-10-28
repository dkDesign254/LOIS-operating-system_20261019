// The one public address people should always use. Sign-in must start and finish here, because the sign-in
// check is stored per address, and the team-only Vercel address asks for a Vercel login.
const CANONICAL = 'https://lois-operating-system20261019.vercel.app'
const TEAM_ALIAS = /-dkdesign254s-projects\.vercel\.app$/
function pick(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || '').trim().replace(/\/$/, '')
  try {
    // A team-only address in the setting would send every new account to a Vercel login. Ignore it.
    if (raw && !TEAM_ALIAS.test(new URL(raw).host)) return raw
  } catch {}
  return CANONICAL
}
export const SITE_URL = pick()
export const SITE_HOST = new URL(SITE_URL).host
export const isTeamAlias = (host: string) => host !== SITE_HOST && TEAM_ALIAS.test(host)
