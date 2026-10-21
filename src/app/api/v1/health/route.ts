import { json } from '../_lib'
import { neonConfigured } from '@/lib/neon'

export const dynamic = 'force-dynamic'

export async function GET() {
  return json({
    api_version: '1',
    status: 'ok',
    time: new Date().toISOString(),
    services: {
      database: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      analytics_mirror: neonConfigured(),
      generative_answers: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  })
}

export async function OPTIONS() {
  return new Response(null, { status: 204 })
}
