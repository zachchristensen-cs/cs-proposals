import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RemoveButtonProps {
  onRemove: () => void
  className?: string
  title?: string
}

export function RemoveButton({ onRemove, className, title = 'Remove' }: RemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onRemove()
      }}
      className={cn(
        'remove-btn shrink-0 rounded p-0.5 text-[#999] opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover/item:opacity-100',
        className,
      )}
      title={title}
    >
      <X className="size-3.5" />
    </button>
  )
}
