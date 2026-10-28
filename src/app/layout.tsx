import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: { default: 'LOIS Knowledge Layer', template: '%s · LOIS' },
  description:
    'LOIS prepares and recommends; a person decides. A help assistant, a knowledge base and a reviewed knowledge bank, with a versioned API for every tool you already use.',
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'LOIS Knowledge Layer', title: 'LOIS: clarity for the people who decide', description: 'Know whether a decision is ready before you make it. A person always decides.' },
  twitter: { card: 'summary_large_image' },
  // Private areas (/app, /internal, /login, /auth) are closed by the X-Robots-Tag header in next.config.mjs.
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#ffffff' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
