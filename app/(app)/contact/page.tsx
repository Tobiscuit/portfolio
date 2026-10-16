'use client'

import { useState } from 'react'
import { Mail } from 'lucide-react'
import PageShell, { Section } from '@/app/components/ui/PageShell'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
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
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <Section>
      <PageShell>
        <div className="contact-layout">
          <div>
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
                <p className="form-status form-status--success">Message sent successfully!</p>
              )}
              {submitStatus === 'error' && (
                <p className="form-status form-status--error">{errorMessage}</p>
              )}
            </form>
          </div>
        </div>
      </PageShell>
    </Section>
  )
}
