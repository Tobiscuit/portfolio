'use client'

import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import TransitionLink from './ui/TransitionLink'
import ThemeToggle from './ui/ThemeToggle'
import Tooltip from './ui/Tooltip'
import ResumeButton from './ResumeButton'
import { RESUME_PATH } from './SiteFooter'

const navLinks = [
  { href: '/projects', text: 'Work' },
  { href: '/about', text: 'About' },
  { href: '/contact', text: 'Contact' },
]

const MENU_ID = 'site-menu'

function Logo() {
  return (
    <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        clipRule="evenodd"
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM8 17.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm4-10c.83 0 1.5-.67 1.5-1.5S12.83 4.5 12 4.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm4 10c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z"
        fillRule="evenodd"
      />
    </svg>
  )
}

export default function Header() {
  const pathname = usePathname()
  const isCurrent = (href: string) => pathname === href || pathname?.startsWith(`${href}/`)
  const closeMenu = () => {
    const menu = document.getElementById(MENU_ID)
    if (menu && 'hidePopover' in menu && menu.matches(':popover-open')) menu.hidePopover()
  }

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <TransitionLink href="/" className="site-header__brand">
          <Logo />
          <span>Juan Ramirez</span>
        </TransitionLink>

        <nav className="site-nav" aria-label="Primary">
          {navLinks.map((link) => (
            <TransitionLink
              key={link.href}
              href={link.href}
              className="site-nav__link"
              aria-current={isCurrent(link.href) ? 'page' : undefined}
            >
              {link.text}
            </TransitionLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <Tooltip label="Switch theme">
            <ThemeToggle />
          </Tooltip>
          <ResumeButton className="btn btn--primary btn--sm site-header__resume">Résumé</ResumeButton>
          <button
            type="button"
            className="btn btn--icon menu-button"
            popoverTarget={MENU_ID}
            aria-label="Open menu"
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile menu: a popover, so Esc, light dismiss and the top layer come from the platform. */}
      <nav id={MENU_ID} popover="auto" className="nav-popover" aria-label="Menu">
        <ul className="nav-popover__list">
          {navLinks.map((link) => (
            <li key={link.href}>
              <TransitionLink
                href={link.href}
                className="nav-popover__link"
                aria-current={isCurrent(link.href) ? 'page' : undefined}
                onClick={closeMenu}
              >
                {link.text}
              </TransitionLink>
            </li>
          ))}
        </ul>
        <hr className="nav-popover__divider" />
        <a href={RESUME_PATH} download className="btn btn--primary btn--block" onClick={closeMenu}>
          Download résumé
        </a>
      </nav>
    </header>
  )
}
