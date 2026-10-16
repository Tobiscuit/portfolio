'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

type DialogProps = {
  open: boolean
  onClose: () => void
  /** Accessible name for the dialog. Rendered visually unless `hideTitle` is set. */
  title: string
  hideTitle?: boolean
  /** Extra actions rendered in the header, before the close button. */
  actions?: ReactNode
  /** `wide` for media; `content` for text. */
  size?: 'content' | 'wide'
  className?: string
  children: ReactNode
}

// `closedby` is newer than the installed React types; it is a plain attribute.
const lightDismiss = { closedby: 'any' } as object

/**
 * Native `<dialog>` modal: top layer, focus trap, Esc to close and an inert
 * page behind it, all from the platform. Light dismiss (click on the backdrop)
 * is declared with `closedby="any"` for browsers that have it and handled by
 * hand for the rest. Entry/exit animation lives in CSS (`@starting-style`).
 */
export default function Dialog({
  open,
  onClose,
  title,
  hideTitle = false,
  actions,
  size = 'content',
  className = '',
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Backdrop click fallback for browsers without `closedby`.
  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={`dialog dialog--${size} ${className}`.trim()}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={handleClick}
      {...lightDismiss}
    >
      <div className="dialog__panel">
        <div className="dialog__header">
          <h2 id={titleId} className={hideTitle ? 'sr-only' : 'dialog__title'}>
            {title}
          </h2>
          <div className="dialog__actions">
            {actions}
            <button type="button" className="btn btn--icon" onClick={onClose} aria-label="Close">
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="dialog__body">{children}</div>
      </div>
    </dialog>
  )
}
