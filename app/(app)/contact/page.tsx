'use client'
import { Mail } from 'lucide-react'
import PageShell from '../../components/ui/PageShell'

import Script from 'next/script'
import { useEffect, useRef, useState } from 'react'
import { TOKEN_FIELD, TURNSTILE_ACTION } from '@/lib/intake/form'

/**
 * Turnstile's site key, inlined at build time. Set together with the server's
 * TURNSTILE_SECRET_KEY (specs/001-platform-intake): without it no widget
 * renders, and the server skips the check only when both are unset.
 */
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

/** The part of Turnstile's explicit-rendering API this page uses. */
interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string | undefined
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    // Honeypot: hidden from people, filled by naive bots. The server discards
    // any submission where this is non-empty.
    _gotcha: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const widgetContainer = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | undefined>(undefined)

  // Explicit rendering, so the widget follows this component's lifecycle.
  // next/script calls onReady after the script loads and on every remount.
  const renderTurnstile = () => {
    if (!TURNSTILE_SITE_KEY || !window.turnstile || !widgetContainer.current || widgetId.current) return
    widgetId.current = window.turnstile.render(widgetContainer.current, {
      sitekey: TURNSTILE_SITE_KEY,
      action: TURNSTILE_ACTION,
      theme: 'dark',
      callback: (token: string) => setTurnstileToken(token),
      'expired-callback': () => setTurnstileToken(''),
      'error-callback': () => setTurnstileToken(''),
    })
  }

  useEffect(
    () => () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = undefined
    },
    [],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(TURNSTILE_SITE_KEY ? { ...formData, [TOKEN_FIELD]: turnstileToken } : formData),
      })
      
      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', message: '', _gotcha: '' })
      } else {
        const body = await response.json().catch(() => null)
        setErrorMessage(body?.error ?? 'Failed to send message. Please try again.')
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error(error);
      setErrorMessage('Could not reach the server. Please try again.')
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
      // A token is single-use: whatever the answer, the next attempt needs a new one.
      if (widgetId.current) {
        window.turnstile?.reset(widgetId.current)
        setTurnstileToken('')
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <PageShell as="section" className="section">
      <div className="contact-layout">
        <div className="contact-intro">
          <p className="eyebrow">Contact</p>
          <h1>Let&apos;s build something efficient.</h1>
          <p className="lede mt-space-m">
            Whether you have a complex system that needs optimization or a new
            project that requires a foundation of clean, performant code, I&apos;m
            ready to dive in.
          </p>
          <p className="measure mt-space-s text-text-muted">
            Hiring for a platform or software-engineering role? The résumé is one click away in the header, and
            I&apos;m glad to walk through any project on this site. Running a small business that needs a website?
            Tell me what it has to do. Either way, I&apos;ll reply personally, usually within a couple of days.
          </p>
          <div className="contact-channels">
            <a className="contact-channel" href="mailto:jramirez203@outlook.com">
              <Mail aria-hidden="true" />
              <span>jramirez203@outlook.com</span>
            </a>
            <a className="contact-channel" href="https://www.linkedin.com/in/cloud-juan-manuel-ramirez/">
              <svg
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect height="12" width="4" x="2" y="9" />
                <circle cx="4" cy="4" r="2" />
              </svg>
              <span>LinkedIn</span>
            </a>
          </div>
        </div>
        <div className="contact-form-panel">
          <form onSubmit={handleSubmit} className="form-stack">
            <input
              type="text"
              name="_gotcha"
              value={formData._gotcha}
              onChange={handleChange}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-0 w-0 opacity-0"
            />
            <div className="field">
              <label
                className="field__label"
                htmlFor="name"
              >
                Name
              </label>
              <div className="field__control">
                <input
                  autoComplete="name"
                  className="field__input"
                  id="name"
                  name="name"
                  placeholder="e.g., Jordan Sage"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label
                className="field__label"
                htmlFor="email"
              >
                Email
              </label>
              <div className="field__control">
                <input
                  autoComplete="email"
                  className="field__input"
                  id="email"
                  name="email"
                  placeholder="you@example.com"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label
                className="field__label"
                htmlFor="message"
              >
                Message
              </label>
              <div className="field__control">
                <textarea
                  className="field__textarea"
                  id="message"
                  name="message"
                  placeholder="e.g., &apos;Hi, I&apos;m looking for a developer for an e-commerce project. Let&apos;s connect!&apos;"
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            {TURNSTILE_SITE_KEY && (
              <>
                <Script
                  src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
                  strategy="afterInteractive"
                  onReady={renderTurnstile}
                />
                <div id="turnstile-widget" ref={widgetContainer} className="flex justify-center md:justify-start" />
              </>
            )}
            <div>
              <button
                className="btn btn--primary btn--block"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
            {submitStatus === 'success' && (
              <p className="text-green-400 text-center">
                Message sent. I&apos;ll reply personally, usually within a couple of days.
              </p>
            )}
            {submitStatus === 'error' && (
              <p className="text-red-400 text-center">{errorMessage}</p>
            )}
          </form>
        </div>
      </div>
    </PageShell>
  )
}