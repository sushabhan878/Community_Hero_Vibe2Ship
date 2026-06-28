'use client'

import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageGalleryProps {
  images: string[]
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [lightbox, setLightbox] = useState<number | null>(null)

  if (images.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-lg bg-zinc-50 text-sm text-zinc-400 dark:bg-zinc-800">
        No images
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {images.map((url, i) => (
          <button
            key={i}
            onClick={() => setLightbox(i)}
            className="shrink-0 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <img
              src={url}
              alt={`Issue image ${i + 1}`}
              className="h-24 w-24 object-cover"
            />
          </button>
        ))}
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80" onClick={() => setLightbox(null)}>
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white"
          >
            <X className="h-6 w-6" />
          </button>

          {lightbox > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1) }}
              className="absolute left-4 rounded-full bg-black/50 p-2 text-white"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          <img
            src={images[lightbox]}
            alt={`Issue image ${lightbox + 1}`}
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightbox < images.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1) }}
              className="absolute right-4 rounded-full bg-black/50 p-2 text-white"
              style={{ right: '5rem' }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          <p className="absolute bottom-4 text-sm text-white">
            {lightbox + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  )
}
