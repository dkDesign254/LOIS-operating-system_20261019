import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

// Public pages (landing, Try, guides) are open. Everything behind sign-in is closed to every crawler.
export default function robots(): MetadataRoute.Robots {
  const AI = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'anthropic-ai', 'CCBot', 'Google-Extended', 'PerplexityBot', 'Bytespider', 'Amazonbot', 'Applebot-Extended', 'cohere-ai', 'Meta-ExternalAgent']
  return {
    rules: [
      { userAgent: '*', allow: ['/', '/try', '/resources', '/privacy'], disallow: ['/app', '/internal', '/api', '/auth', '/login'] },
      { userAgent: AI, allow: ['/resources', '/privacy'], disallow: ['/app', '/internal', '/api', '/auth', '/login', '/try'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
