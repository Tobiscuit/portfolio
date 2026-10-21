import React from 'react'

export const metadata = {
  title: 'Payload on Workers spike',
  description: 'Spec 003 hosting spike: Payload 3 on Cloudflare Workers with D1 and R2.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
