// The one public address people should always use. Sign-in must start and finish here, because the sign-in
// check is stored per address, and the team-only Vercel address asks for a Vercel login.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://lois-operating-system20261019.vercel.app').replace(/\/$/, '')
export const SITE_HOST = new URL(SITE_URL).host
export const isTeamAlias = (host: string) => host !== SITE_HOST && /-dkdesign254s-projects\.vercel\.app$/.test(host)
