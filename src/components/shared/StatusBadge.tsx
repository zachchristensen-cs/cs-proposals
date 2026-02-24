import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

const statusConfig: Record<string, { label: string; color: string }> = {
  // Ticket statuses
  submitted: { label: 'Submitted', color: 'bg-blue-500' },
  processing: { label: 'Processing', color: 'bg-yellow-500' },
  in_dev: { label: 'In Dev', color: 'bg-orange-500' },
  in_progress: { label: 'In Progress', color: 'bg-purple-500' },
  completed: { label: 'Completed', color: 'bg-green-500' },

  // Phase statuses
  not_started: { label: 'Not Started', color: 'bg-gray-400' },

  // Round statuses
  delivered: { label: 'Delivered', color: 'bg-blue-500' },
  review: { label: 'Review', color: 'bg-amber-500' },
  approved: { label: 'Approved', color: 'bg-green-500' },
  not_needed: { label: 'Not Needed', color: 'bg-gray-400' },

  // Contract statuses
  pending: { label: 'Pending', color: 'bg-yellow-500' },
  sent: { label: 'Sent', color: 'bg-blue-500' },
  signed: { label: 'Signed', color: 'bg-green-500' },
  not_required: { label: 'Not Required', color: 'bg-gray-400' },

  // Payment statuses
  deposit_paid: { label: 'Deposit Paid', color: 'bg-blue-500' },
  fully_paid: { label: 'Fully Paid', color: 'bg-green-500' },

  // Project statuses
  onboarding: { label: 'Onboarding', color: 'bg-blue-500' },
  active: { label: 'Active', color: 'bg-green-500' },
  archived: { label: 'Archived', color: 'bg-gray-400' },
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status.replace(/_/g, ' '),
    color: 'bg-gray-400',
  }

  return (
    <Badge variant="secondary" className={cn('gap-1.5 capitalize', className)}>
      <span className={cn('size-1.5 rounded-full', config.color)} />
      {config.label}
    </Badge>
  )
}
