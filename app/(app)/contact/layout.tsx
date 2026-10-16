import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach Juan Ramirez about a platform or software-engineering role, or about a website for your small business. He replies personally, usually within a couple of days.',
}

export default function ContactLayout({ children }: { children: ReactNode }) {
  return children
}
