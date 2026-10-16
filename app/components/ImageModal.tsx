'use client'

import Image from 'next/image'
import { Minus, Plus, RotateCcw } from 'lucide-react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import Dialog from './ui/Dialog'

type ImageModalProps = {
  imageUrl: string | null
  onClose: () => void
}

export default function ImageModal({ imageUrl, onClose }: ImageModalProps) {
  return (
    <Dialog open={imageUrl !== null} onClose={onClose} title="Diagram" hideTitle size="wide">
      {imageUrl && (
        <div className="dialog__zoom">
          <TransformWrapper initialScale={1} minScale={0.5} maxScale={10} doubleClick={{ disabled: true }}>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <TransformComponent
                  wrapperStyle={{ height: '100%', width: '100%' }}
                  contentStyle={{ height: '100%', width: '100%' }}
                >
                  <div className="relative flex h-full w-full items-center justify-center">
                    {imageUrl.endsWith('.svg') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt="Architecture diagram" className="h-full w-full object-contain" />
                    ) : (
                      <Image src={imageUrl} alt="Architecture diagram" fill sizes="100vw" className="object-contain" />
                    )}
                  </div>
                </TransformComponent>
                <div className="dialog__zoom-controls">
                  <button type="button" className="btn btn--icon" onClick={() => zoomIn(0.2)} aria-label="Zoom in">
                    <Plus aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn--icon" onClick={() => zoomOut(0.2)} aria-label="Zoom out">
                    <Minus aria-hidden="true" />
                  </button>
                  <button type="button" className="btn btn--icon" onClick={() => resetTransform()} aria-label="Reset zoom">
                    <RotateCcw aria-hidden="true" />
                  </button>
                </div>
              </>
            )}
          </TransformWrapper>
        </div>
      )}
    </Dialog>
  )
}
