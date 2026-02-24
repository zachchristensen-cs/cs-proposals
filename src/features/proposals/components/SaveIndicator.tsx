import { cn } from '@/lib/utils'

interface SaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error'
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === 'idle') return null

  return (
    <span
      className={cn(
        'text-xs transition-opacity',
        status === 'saving' && 'text-muted-foreground animate-pulse',
        status === 'saved' && 'text-muted-foreground',
        status === 'error' && 'text-destructive',
      )}
    >
      {status === 'saving' && 'Saving...'}
      {status === 'saved' && 'Saved'}
      {status === 'error' && 'Unsaved changes'}
    </span>
  )
}
