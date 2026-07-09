import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ProposalContent } from '@/types/database'
import { useSlides } from './useSlides'
import { getBrand } from '../renderer/brands'

interface PresentationModeProps {
  content: ProposalContent
  onClose: () => void
}

export function PresentationMode({ content, onClose }: PresentationModeProps) {
  const slides = useSlides(content)
  const [currentIndex, setCurrentIndex] = useState(0)
  const directionRef = useRef<'forward' | 'backward'>('forward')

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= slides.length - 1) return prev
      directionRef.current = 'forward'
      return prev + 1
    })
  }, [slides.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev
      directionRef.current = 'backward'
      return prev - 1
    })
  }, [])

  const goTo = useCallback((index: number) => {
    setCurrentIndex((prev) => {
      directionRef.current = index > prev ? 'forward' : 'backward'
      return index
    })
  }, [])

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault()
          goNext()
          break
        case 'ArrowLeft':
          e.preventDefault()
          goPrev()
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goNext, goPrev, onClose])

  // Body scroll lock
  useEffect(() => {
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [])

  const currentSlide = slides[currentIndex]
  const isFirst = currentIndex === 0
  const isLast = currentIndex === slides.length - 1

  return createPortal(
    <div className={`${getBrand(content.brand).themeClass} fixed inset-0 z-[100] bg-[var(--p-bg)]`}>
      {/* Slide content — vertically centered */}
      <div className="flex h-full items-center justify-center px-6 py-16">
        <div className="w-full max-w-3xl max-h-[calc(100vh-8rem)] overflow-y-auto px-6 sm:px-10">
          <div
            key={`${currentSlide.id}-${currentIndex}`}
            className={cn(
              'animate-in fade-in duration-300',
              directionRef.current === 'forward'
                ? 'slide-in-from-right-4'
                : 'slide-in-from-left-4',
            )}
          >
            {currentSlide.render()}
          </div>
        </div>
      </div>

      {/* Click zones for navigation */}
      {!isFirst && (
        <div
          className="absolute inset-y-0 left-0 w-1/4 cursor-pointer"
          onClick={goPrev}
        />
      )}
      {!isLast && (
        <div
          className="absolute inset-y-0 right-0 w-1/4 cursor-pointer"
          onClick={goNext}
        />
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full p-2 text-[var(--p-muted)] transition-colors hover:bg-[var(--p-border)]/50 hover:text-[var(--p-ink)]"
      >
        <X className="size-5" />
      </button>

      {/* Arrow hints (visible on hover near edges) */}
      {!isFirst && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-16 items-center justify-center opacity-0 transition-opacity hover:opacity-100 peer-hover:opacity-100">
          <div className="rounded-full bg-white/60 p-2 text-[var(--p-muted)]">
            <ChevronLeft className="size-5" />
          </div>
        </div>
      )}
      {!isLast && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex w-16 items-center justify-center opacity-0 transition-opacity">
          <div className="rounded-full bg-white/60 p-2 text-[var(--p-muted)]">
            <ChevronRight className="size-5" />
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center px-6 pb-6">
        <div className="flex items-center gap-4">
          {/* Progress dots */}
          <TooltipProvider>
            <div className="flex items-center gap-1.5">
              {slides.map((slide, i) => (
                <Tooltip key={slide.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => goTo(i)}
                      className={cn(
                        'rounded-full transition-all duration-200',
                        i === currentIndex
                          ? 'size-2.5 bg-[var(--p-ink)]'
                          : 'size-1.5 bg-[var(--p-border)] hover:bg-[var(--p-muted)]',
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {slide.label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {/* Slide counter */}
          <span className="text-xs tabular-nums text-[var(--p-muted)]">
            {currentIndex + 1} / {slides.length}
          </span>
        </div>
      </div>
    </div>,
    document.body,
  )
}
