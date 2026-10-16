'use client'

import { Moon, Sun } from 'lucide-react'

export const THEME_STORAGE_KEY = 'theme'

/**
 * Inline bootstrap, rendered before any content so the stored scheme is on
 * `<html>` before first paint. Kept tiny and dependency-free on purpose.
 */
export const themeBootstrapScript = `try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}`

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage may be unavailable (private mode); the choice still applies for this page.
  }
}

/**
 * Dark is the brand default; light is an explicit choice that persists.
 * The current state is read from `<html data-theme>` so the server render
 * never disagrees with the client: both icons are in the DOM and CSS picks one.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const toggle = () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
  }

  return (
    <button type="button" className={`theme-toggle ${className}`.trim()} onClick={toggle}>
      <Sun className="theme-toggle__icon theme-toggle__icon--sun" aria-hidden="true" />
      <Moon className="theme-toggle__icon theme-toggle__icon--moon" aria-hidden="true" />
      <span className="sr-only theme-toggle__label theme-toggle__label--to-light">Switch to light theme</span>
      <span className="sr-only theme-toggle__label theme-toggle__label--to-dark">Switch to dark theme</span>
    </button>
  )
}
