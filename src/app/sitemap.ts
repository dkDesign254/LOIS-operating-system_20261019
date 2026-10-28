import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'
import { GUIDES } from '@/lib/guides'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly' },
    { url: `${SITE_URL}/try`, changeFrequency: 'monthly' },
    { url: `${SITE_URL}/resources`, changeFrequency: 'weekly' },
    ...GUIDES.map((g) => ({ url: `${SITE_URL}/resources/${g.slug}`, changeFrequency: 'monthly' as const })),
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly' },
  ]
}
