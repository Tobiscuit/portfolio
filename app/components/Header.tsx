'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import ResumeModal from './ResumeModal'

export default function Header() {
  const pathname = usePathname()
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false)

  return (
    <header className="w-full">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <svg
            className="h-8 w-8 text-parchment-100"
            fill="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              clipRule="evenodd"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8 17.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm4-10c.83 0 1.5-.67 1.5-1.5S12.83 4.5 12 4.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm4 10c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"
              fillRule="evenodd"
            />
          </svg>
          <span className="text-xl font-bold font-serif tracking-tight">SageScale</span>
        </Link>
        
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/projects"
              className={`text-sm font-medium transition-colors ${
                pathname === '/projects' 
                  ? 'text-parchment-100' 
                  : 'text-ink-500 hover:text-parchment-100'
              }`}
            >
              Work
            </Link>
            <Link
              href="/about"
              className={`text-sm font-medium transition-colors ${
                pathname === '/about' 
                  ? 'text-parchment-100' 
                  : 'text-ink-500 hover:text-parchment-100'
              }`}
            >
              About
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors ${
                pathname === '/contact' 
                  ? 'text-parchment-100' 
                  : 'text-ink-500 hover:text-parchment-100'
              }`}
            >
              Contact
            </Link>
          </nav>
          
          <button 
            onClick={() => setIsResumeModalOpen(true)}
            className="hidden md:flex items-center justify-center px-6 py-2 bg-arcane-gold-500 text-sage-blue-900 text-sm font-bold rounded-lg hover:shadow-sm transition-all"
          >
            Resume
          </button>
        </div>
        
        <button className="md:hidden text-parchment-100">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6h16M4 12h16m-7 6h7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </button>
      </div>
      </div>
      <ResumeModal isOpen={isResumeModalOpen} onClose={() => setIsResumeModalOpen(false)} />
    </header>
  )
}