import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'LOIS Knowledge Layer', template: '%s · LOIS' },
  description:
    'LOIS prepares and recommends; a person decides. A help assistant, a knowledge base and a reviewed knowledge bank, with a versioned API for every tool you already use.',
  robots: { index: false, follow: false },
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
