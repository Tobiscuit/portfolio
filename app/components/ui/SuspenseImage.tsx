'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

// Props for SuspenseImage
type SuspenseImageProps = {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  sizes?: string
  priority?: boolean
  quality?: number
  onClick?: () => void
  aspectRatio?: string
  skeletonClassName?: string
}

// Skeleton component with customizable aspect ratio
export function ImageSkeleton({ aspectRatio = '16/9', className = '' }: { aspectRatio?: string; className?: string }) {
  return (
    <div 
      className={`w-full bg-ink-800 animate-pulse rounded-lg ${className}`}
      style={{ aspectRatio }}
    />
  )
}

// Main export: SuspenseImage with skeleton loading state
export function SuspenseImage({ 
  src, 
  alt, 
  width = 1920, 
  height = 1080, 
  className = '', 
  sizes,
  quality = 90,
  onClick,
  aspectRatio = '16/9',
  skeletonClassName = ''
}: SuspenseImageProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [src])

  if (hasError) {
    return <ImageSkeleton aspectRatio={aspectRatio} className={skeletonClassName} />
  }

  return (
    <div className="relative" style={{ aspectRatio }}>
      {/* Skeleton loader shown while image loads */}
      {isLoading && (
        <div className="absolute inset-0 bg-ink-800 animate-pulse rounded-lg" />
      )}
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        quality={quality}
        sizes={sizes}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
        onClick={onClick}
      />
    </div>
  )
}

// SVG component with proper rendering (no Next.js Image optimization needed for SVGs)
export function SuspenseSvg({ 
  src, 
  alt, 
  className = '',
  onClick 
}: { 
  src: string
  alt: string
  className?: string
  onClick?: () => void
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Reset loading state when src changes
  useEffect(() => {
    setIsLoading(true)
    setHasError(false)
  }, [src])

  if (hasError) {
    return <ImageSkeleton aspectRatio="16/9" className={className} />
  }

  return (
    <div className="relative w-full">
      {/* Skeleton loader shown while SVG loads */}
      {isLoading && (
        <div className="w-full bg-ink-800 animate-pulse rounded-lg" style={{ aspectRatio: '16/9' }} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-auto ${className} ${isLoading ? 'opacity-0 absolute inset-0' : 'opacity-100'} transition-opacity duration-300`}
        style={{ objectFit: 'contain' }}
        onClick={onClick}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false)
          setHasError(true)
        }}
      />
    </div>
  )
}

export default SuspenseImage
