'use client'

import { useEffect } from 'react'
import Image from 'next/image'

type ImageModalProps = {
  imageUrl: string | null;
  onClose: () => void;
};

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  useEffect(() => {
    if (imageUrl) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    // Cleanup function to remove the class if the component unmounts
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [imageUrl]);

  if (!imageUrl) return null

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-4xl max-h-full"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the image itself
      >
        <Image
          src={imageUrl}
          alt="Architectural Diagram"
          width={1920}
          height={1080}
          className="w-auto h-auto max-w-full max-h-[90vh] object-contain"
        />
      </div>
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-4xl font-bold"
        aria-label="Close image modal"
      >
        &times;
      </button>
    </div>
  )
} 