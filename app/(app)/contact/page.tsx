'use client'

import { useState } from 'react'

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
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        <div className="md:col-span-5 flex flex-col justify-center text-center md:text-left">
          <h2 className="text-3xl font-bold tracking-tight text-parchment-100 sm:text-4xl">
            Let&apos;s Build Something Efficient.
          </h2>
          <p className="mt-4 text-lg text-parchment-300">
            Whether you have a complex system that needs optimization or a new
            project that requires a foundation of clean, performant code, I&apos;m
            ready to dive in. Let&apos;s connect.
          </p>
          <div className="mt-8 flex flex-col gap-4">
            <a
              className="group inline-flex items-center justify-center md:justify-start gap-3 text-lg text-parchment-100 hover:text-amber-500 transition-colors"
              href="mailto:jramirez203@outlook.com"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                height="24"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                width="24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect height="16" rx="2" width="20" x="2" y="4" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>jramirez203@outlook.com</span>
            </a>
            <div className="flex items-center justify-center md:justify-start space-x-4 mt-4">
              <a
                className="text-parchment-300 hover:text-white transition-colors"
                href="https://www.linkedin.com/in/cloud-juan-manuel-ramirez/"
              >
                <svg
                  fill="none"
                  height="28"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  width="28"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect height="12" width="4" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="md:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-6">
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
            <div>
              <label
                className="block text-sm font-medium text-parchment-100"
                htmlFor="name"
              >
                Name
              </label>
              <div className="mt-1">
                <input
                  autoComplete="name"
                  className="block w-full rounded-md border-transparent bg-ink-700 text-white placeholder-parchment-300 focus:border-amber-500 focus:ring-amber-500 sm:text-sm py-3 px-4"
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
            <div>
              <label
                className="block text-sm font-medium text-parchment-100"
                htmlFor="email"
              >
                Email
              </label>
              <div className="mt-1">
                <input
                  autoComplete="email"
                  className="block w-full rounded-md border-transparent bg-ink-700 text-white placeholder-parchment-300 focus:border-amber-500 focus:ring-amber-500 sm:text-sm py-3 px-4"
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
            <div>
              <label
                className="block text-sm font-medium text-parchment-100"
                htmlFor="message"
              >
                Message
              </label>
              <div className="mt-1">
                <textarea
                  className="block w-full rounded-md border-transparent bg-ink-700 text-white placeholder-parchment-300 focus:border-amber-500 focus:ring-amber-500 sm:text-sm py-3 px-4"
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
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-sage-blue-950 bg-amber-500 hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-sage-blue-900 transition-colors disabled:opacity-50"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </div>
            {submitStatus === 'success' && (
              <p className="text-green-400 text-center">Message sent successfully!</p>
            )}
            {submitStatus === 'error' && (
              <p className="text-red-400 text-center">{errorMessage}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}