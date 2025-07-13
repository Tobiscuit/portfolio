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
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-arcane-gold-500 text-sage-blue-900 rounded-full flex items-center justify-center text-lg font-bold z-10"
          aria-label="Close resume viewer"
        >
          &times;
        </button>
        <iframe
          src="/resume.pdf"
          className="w-full h-full border-0 rounded-lg"
          title="Resume"
        ></iframe>
      </div>
    </div>
  );
} 