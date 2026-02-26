import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddButtonProps {
  onAdd: () => void
  label?: string
  className?: string
}

export function AddButton({ onAdd, label = 'Add item', className }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onAdd()
      }}
      className={cn(
        'add-btn mt-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-[#999] opacity-0 transition-opacity hover:bg-blue-50 hover:text-blue-600 group-hover/list:opacity-100',
        className,
      )}
      title={label}
    >
      <Plus className="size-3" />
      <span>{label}</span>
    </button>
  )
}
