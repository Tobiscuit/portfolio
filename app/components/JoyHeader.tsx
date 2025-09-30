'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function JoyHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="bg-white sticky top-0 z-10">
      <div className="px-4 md:px-10 lg:px-20 mx-auto">
        <div className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#f0f1f5] py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-[#111218]">
            <span className="material-symbols-outlined text-2xl text-[#3D5AFE]">construction</span>
            <h2 className="text-[#111218] text-xl font-bold leading-tight tracking-[-0.015em]">WeFix4U</h2>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-9">
            <Link href="/" className="text-gray-600 text-sm font-medium leading-normal hover:text-[#3D5AFE]">
              Home
            </Link>
            <Link href="/projects" className="text-gray-600 text-sm font-medium leading-normal hover:text-[#3D5AFE]">
              Services
            </Link>
            <Link href="/about" className="text-gray-600 text-sm font-medium leading-normal hover:text-[#3D5AFE]">
              Shop
            </Link>
            <Link href="/contact" className="text-[#F57C00] text-sm font-bold leading-normal border-b-2 border-[#F57C00]">
              Sign Up
            </Link>
            <Link href="/contact" className="text-gray-600 text-sm font-medium leading-normal hover:text-[#3D5AFE]">
              Log In
            </Link>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-[#f0f1f5] py-4">
            <nav className="flex flex-col gap-4">
              <Link 
                href="/" 
                className="text-gray-600 text-sm font-medium leading-normal hover:text-[#3D5AFE]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                href="/projects" 
                className="text-gray-600 text-sm font-medium leading-normal hover:text-[#3D5AFE]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Services
              </Link>
              <Link 
                href="/about" 
                className="text-gray-600 text-sm font-medium leading-normal hover:text-[#3D5AFE]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Shop
              </Link>
              <Link 
                href="/contact" 
                className="text-[#F57C00] text-sm font-bold leading-normal border-b-2 border-[#F57C00]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign Up
              </Link>
              <Link 
                href="/contact" 
                className="text-gray-600 text-sm font-medium leading-normal hover:text-[#3D5AFE]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Log In
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
