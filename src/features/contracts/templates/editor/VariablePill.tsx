import { cn } from '@/lib/utils'

interface VariablePillProps {
  name: string
  onClick?: () => void
}

export default function VariablePill({ name, onClick }: VariablePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs font-medium',
        'hover:bg-blue-200 transition-colors cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-1'
      )}
    >
      {name}
    </button>
  )
}
