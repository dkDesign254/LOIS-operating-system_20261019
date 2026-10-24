import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { SITE_URL, isTeamAlias } from '@/lib/site'

// Refreshes the Supabase session cookie and keeps /app behind sign-in.
export async function middleware(req: NextRequest) {
  // If Supabase falls back to the Site URL (redirect URL not on its allow-list), the sign-in code arrives at the
  // homepage or /login. Hand it to the callback so the person still lands inside the app.
  const p = req.nextUrl.pathname
  // Anyone who reaches the team-only address (for example because they are signed in to Vercel) is moved to the public one.
  if (isTeamAlias(req.nextUrl.host)) return NextResponse.redirect(`${SITE_URL}${p}${req.nextUrl.search}`)
  // Supabase sent an error to the homepage: show it on the sign-in screen instead of a dead end.
  if ((p === '/' || p === '/login') && req.nextUrl.searchParams.get('error_code')) {
    const to = req.nextUrl.clone()
    to.pathname = '/login'
    const why = req.nextUrl.searchParams.get('error_description') ?? req.nextUrl.searchParams.get('error_code') ?? ''
    to.search = `?error=1&why=${encodeURIComponent(why.slice(0, 160))}`
    return NextResponse.redirect(to)
  }
  if ((p === '/' || p === '/login') && req.nextUrl.searchParams.get('code')) {
    const to = req.nextUrl.clone()
    to.pathname = '/auth/callback'
    if (!to.searchParams.get('next')) to.searchParams.set('next', '/app')
    return NextResponse.redirect(to)
  }
  let res = NextResponse.next({ request: req })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !key) return res

  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user && (req.nextUrl.pathname.startsWith('/app') || req.nextUrl.pathname.startsWith('/internal'))) {
    const to = req.nextUrl.clone()
    to.pathname = '/login'
    to.search = ''
    to.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(to)
  }
  return res
}

export const config = { matcher: ['/', '/app/:path*', '/internal/:path*', '/login', '/start'] }
