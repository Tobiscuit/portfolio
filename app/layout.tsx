import type { Metadata } from 'next'
import './globals.css'
import { Inter, Source_Serif_4 } from 'next/font/google'
import Header from './components/Header'

export const metadata: Metadata = {
  title: 'Juan Ramirez | Portfolio',
  description: 'The portfolio of Juan Ramirez, a software developer specializing in scalable web applications.',
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
      <body className="bg-sage-blue-900 text-parchment-100" suppressHydrationWarning={true}>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}