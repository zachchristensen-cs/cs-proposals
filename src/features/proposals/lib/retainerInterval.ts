import type { ProposalContent } from '@/types/database'

export type RetainerInterval = NonNullable<ProposalContent['retainer_interval']>

export const RETAINER_INTERVALS: {
  id: RetainerInterval
  label: string
  suffix: string
  billedNote: string
}[] = [
  { id: 'monthly', label: 'Monthly', suffix: '/mo', billedNote: 'Billed monthly' },
  { id: 'quarterly', label: 'Quarterly', suffix: '/qtr', billedNote: 'Billed quarterly' },
  { id: 'semiannual', label: 'Semi-annual', suffix: '/6 mo', billedNote: 'Billed semi-annually' },
  { id: 'annual', label: 'Annual', suffix: '/yr', billedNote: 'Billed annually' },
]

export function retainerIntervalConfig(interval?: string) {
  return RETAINER_INTERVALS.find((i) => i.id === interval) ?? RETAINER_INTERVALS[0]
}
