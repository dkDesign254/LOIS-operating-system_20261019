import { SITE_URL } from '@/lib/site'
import { GUIDES } from '@/lib/guides'

// A short, plain description for AI assistants. Public pages only: nothing behind sign-in is listed.
export function GET() {
  const body = [
    '# LOIS Knowledge Layer',
    '',
    '> LOIS prepares and recommends; a person decides. It helps decision-makers see whether a decision is ready, keeps a reviewed knowledge bank, and puts every major AI model in one place. Built by The Lucrebag.',
    '',
    '## Try it',
    `- [Decision Brief, no account needed](${SITE_URL}/try): check a decision for gaps, evidence and who should approve`,
    '',
    '## Guides',
    ...GUIDES.map((g) => `- [${g.title}](${SITE_URL}/resources/${g.slug}): ${g.summary}`),
    '',
    '## Policies',
    `- [Privacy notice](${SITE_URL}/privacy)`,
    '',
    '## Not for crawling',
    'The signed-in app, staff console and API are private and disallowed in robots.txt.',
    '',
  ].join('\n')
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } })
}
