import type { Metadata } from 'next'
import './globals.css'
import { Inter, Source_Serif_4 } from 'next/font/google'
import { HeaderProvider } from './components/HeaderProvider'
import DynamicHeader from './components/DynamicHeader'
import HeaderToggle from './components/HeaderToggle'

const siteUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Juan Ramirez | Portfolio',
  description: 'The portfolio of Juan Ramirez, a software developer specializing in scalable web applications.',
  openGraph: {
    images: ['/metadata-icon.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon/favicon-16x16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon/favicon-32x32.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
    ],
  },
  manifest: '/favicon/site.webmanifest',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${sourceSerif.variable}`}
      suppressHydrationWarning={true}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Roboto:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-sage-blue-900 text-parchment-100" suppressHydrationWarning={true}>
        <HeaderProvider>
          <div className="min-h-screen flex flex-col">
            <DynamicHeader />
            <main className="flex-grow">
              {children}
            </main>
          </div>
          <HeaderToggle />
        </HeaderProvider>
      </body>
    </html>
  )
}