import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Refreshes the Supabase session cookie and keeps /app behind sign-in.
export async function middleware(req: NextRequest) {
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

  if (!user && req.nextUrl.pathname.startsWith('/app')) {
    const to = req.nextUrl.clone()
    to.pathname = '/login'
    to.search = ''
    to.searchParams.set('next', req.nextUrl.pathname)
    return NextResponse.redirect(to)
  }
  return res
}

export const config = { matcher: ['/app/:path*', '/login', '/start'] }
