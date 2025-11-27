'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import ResumeModal from './ResumeModal'

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  return isMobile
}

export default function Header() {
  const pathname = usePathname()
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  const navLinks = [
    { href: '/projects', text: 'Work' },
    { href: '/about', text: 'About' },
    { href: '/contact', text: 'Contact' },
  ]

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    // Cleanup function to reset overflow when component unmounts
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isMobileMenuOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

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
            <span className="text-xl font-bold font-serif tracking-tight">Juan Ramirez</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? 'text-parchment-100'
                      : 'text-ink-500 hover:text-parchment-100'
                  }`}
                >
                  {link.text}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => setIsResumeModalOpen(true)}
              className="flex items-center justify-center px-6 py-2 bg-arcane-gold-500 text-sage-blue-900 text-sm font-bold rounded-lg hover:shadow-sm transition-all"
            >
              Resume
            </button>
          </div>
          
          <button
            className="md:hidden text-parchment-100 z-50"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-sage-blue-900 z-40 transition-opacity duration-300 ease-in-out ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full pt-20">
          <nav className="flex flex-col items-center gap-12">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-2xl font-medium transition-colors ${
                  pathname === link.href
                    ? 'text-arcane-gold-500'
                    : 'text-parchment-100 hover:text-arcane-gold-500'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.text}
              </Link>
            ))}
          </nav>
          <a
            href="/JuanRamirez-Resume-September-2025.pdf"
            download="JuanRamirez-Resume-September-2025.pdf"
            className="mt-16 w-3/4 flex items-center justify-center px-6 py-3 bg-arcane-gold-500 text-sage-blue-900 font-bold rounded-lg hover:shadow-sm transition-all text-lg"
          >
            Resume
          </a>
        </div>
      </div>

      <ResumeModal isOpen={isResumeModalOpen} onClose={() => setIsResumeModalOpen(false)} />
    </header>
  )
}