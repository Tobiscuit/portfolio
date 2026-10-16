'use client'

import { useState, type ReactNode } from 'react'
import ResumeModal from './ResumeModal'

type ResumeButtonProps = {
  className?: string
  children?: ReactNode
}

/** Opens the résumé viewer. Server components can render this without becoming client components themselves. */
export default function ResumeButton({ className = 'btn btn--primary', children = 'View résumé' }: ResumeButtonProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <ResumeModal isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
