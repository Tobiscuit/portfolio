'use client'

import { useEffect, useRef } from 'react';

type ResumeModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ResumeModal({ isOpen, onClose }: ResumeModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close modal on escape key press
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Close modal on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-4xl h-[90vh] bg-sage-blue-900 rounded-lg shadow-xl"
      >
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <a
            href="/JuanRamirez-Resume-September-2025.pdf"
            download="JuanRamirez-Resume-September-2025.pdf"
            className="px-4 py-2 bg-arcane-gold-500 text-sage-blue-900 text-sm font-bold rounded-lg hover:bg-arcane-gold-400 transition-colors"
          >
            Download
          </a>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-arcane-gold-500 text-sage-blue-900 rounded-full flex items-center justify-center text-lg font-bold hover:bg-arcane-gold-400 transition-colors"
            aria-label="Close resume viewer"
          >
            &times;
          </button>
        </div>
        <iframe
          src="/JuanRamirez-Resume-September-2025.pdf"
          className="w-full h-full border-0 rounded-lg"
          title="Resume"
        ></iframe>
      </div>
    </div>
  );
} 