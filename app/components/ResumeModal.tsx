'use client'

import { Download } from 'lucide-react'
import Dialog from './ui/Dialog'
import { RESUME_PATH } from './SiteFooter'

type ResumeModalProps = {
  isOpen: boolean
  onClose: () => void
}

export default function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Résumé"
      size="wide"
      actions={
        <a href={RESUME_PATH} download className="btn btn--primary btn--sm">
          <Download aria-hidden="true" />
          Download
        </a>
      }
    >
      {/* The PDF loads only while the dialog is open. */}
      {isOpen && <iframe src={RESUME_PATH} className="dialog__frame" title="Résumé (PDF)" />}
    </Dialog>
  )
}
