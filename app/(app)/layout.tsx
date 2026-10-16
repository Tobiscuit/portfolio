import type { Metadata, Viewport } from 'next'
import '../globals.css'
import { Inter, Source_Serif_4 } from 'next/font/google'
import Header from '@/components/Header'
import SiteFooter from '@/components/SiteFooter'
import { ViewTransitionSettler } from '@/components/ui/TransitionLink'
import { themeBootstrapScript } from '@/components/ui/ThemeToggle'

const siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Juan Ramirez — Platform Engineer',
    template: '%s — Juan Ramirez',
  },
  description:
    'Platform engineer: k3s, GitOps, Vault, Argo CD. Builds the apps too (React/Next.js). AWS Certified Cloud Practitioner. Projects, case studies and contact.',
  openGraph: {
    type: 'website',
    siteName: 'Juan Ramirez',
    images: ['/metadata-icon.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', type: 'image/png', sizes: '180x180' }],
  },
  manifest: '/favicon/site.webmanifest',
}

// Pinch-zoom stays available: no maximum scale, no user-scalable lock (WCAG 1.4.4).
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0D1B2A',
}

// Variable fonts; next/font self-hosts them and generates size-adjusted
// fallbacks (adjustFontFallback), so the swap causes no layout shift.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-source-serif',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`} suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        {/* Applies a stored light/dark choice before first paint; ~150 bytes, inline. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <div className="site">
          <Header />
          <main id="main" className="site-main" tabIndex={-1}>
            {children}
          </main>
          <SiteFooter />
        </div>
        <ViewTransitionSettler />
      </body>
    </html>
  )
}
