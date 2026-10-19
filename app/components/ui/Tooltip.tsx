'use client'

import { cloneElement, isValidElement, useId, useRef, type CSSProperties, type ReactElement, type ReactNode } from 'react'

type TooltipProps = {
  /** Short text. The trigger must already have its own accessible name. */
  label: ReactNode
  children: ReactElement<{ 'aria-describedby'?: string }>
}

/**
 * Hover/focus tooltip built on the Popover API and CSS anchor positioning:
 * `popover="manual"` puts it in the top layer; `position-anchor` places it
 * above its trigger. Browsers without anchor positioning never show it, which
 * is fine because the trigger carries its own label; the tooltip is a hint.
 */
export default function Tooltip({ label, children }: TooltipProps) {
  const id = useId()
  const ref = useRef<HTMLSpanElement>(null)
  const anchorName = `--tip-${id.replace(/[^a-zA-Z0-9-]/g, '')}`

  const show = () => {
    const el = ref.current
    if (el && 'showPopover' in el && !el.matches(':popover-open')) {
      try {
        el.showPopover()
      } catch {
        /* already open or not connected */
      }
    }
  }
  const hide = () => {
    const el = ref.current
    if (el && 'hidePopover' in el && el.matches(':popover-open')) el.hidePopover()
  }

  const trigger = isValidElement(children) ? cloneElement(children, { 'aria-describedby': id }) : children

  return (
    <span
      className="tooltip-host"
      style={{ '--anchor': anchorName } as CSSProperties}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {trigger}
      <span ref={ref} id={id} role="tooltip" popover="manual" className="tooltip">
        {label}
      </span>
    </span>
  )
}
