'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

type ImageModalProps = {
  imageUrl: string | null
  onClose: () => void
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  const scrollPosition = useRef(0)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (imageUrl) {
      scrollPosition.current = window.scrollY
      document.body.classList.add('overflow-hidden')
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollPosition.current}px`
      document.body.style.width = '100%'
      window.addEventListener('keydown', handleKeyDown)
    } else {
      document.body.classList.remove('overflow-hidden')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollPosition.current)
    }

    return () => {
      document.body.classList.remove('overflow-hidden')
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [imageUrl, onClose])

  if (!imageUrl) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative h-full w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={10}
          doubleClick={{ disabled: true }}
        >
          {({ zoomIn, zoomOut, resetTransform }) => (
            <>
              <TransformComponent
                wrapperStyle={{ height: '100%', width: '100%' }}
                contentStyle={{ height: '100%', width: '100%' }}
              >
                <div className="relative flex h-full w-full items-center justify-center">
                  {imageUrl.endsWith('.svg') ? (
                    <img
                      src={imageUrl}
                      alt="Architectural Diagram"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Image
                      src={imageUrl}
                      alt="Architectural Diagram"
                      layout="fill"
                      objectFit="contain"
                      className="object-contain"
                    />
                  )}
                </div>
              </TransformComponent>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                <button
                  onClick={() => zoomIn(0.2)}
                  className="rounded-md bg-gray-800/50 px-3 py-1 text-white backdrop-blur-sm"
                >
                  +
                </button>
                <button
                  onClick={() => zoomOut(0.2)}
                  className="rounded-md bg-gray-800/50 px-3 py-1 text-white backdrop-blur-sm"
                >
                  -
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="rounded-md bg-gray-800/50 px-3 py-1 text-white backdrop-blur-sm"
                >
                  Reset
                </button>
              </div>
            </>
          )}
        </TransformWrapper>
      </div>
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-4xl font-bold text-white"
        aria-label="Close image modal"
      >
        &times;
      </button>
    </div>
  )
}