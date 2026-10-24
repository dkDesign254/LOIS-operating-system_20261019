import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Refreshes the Supabase session cookie and keeps /app behind sign-in.
export async function middleware(req: NextRequest) {
  // If Supabase falls back to the Site URL (redirect URL not on its allow-list), the sign-in code arrives at the
  // homepage or /login. Hand it to the callback so the person still lands inside the app.
  const p = req.nextUrl.pathname
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
