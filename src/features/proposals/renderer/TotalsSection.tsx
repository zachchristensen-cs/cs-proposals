import { formatCurrency } from '../lib/formatCurrency'

interface TotalsSectionProps {
  total: number
  paymentNote?: string
  maintenanceNote?: string
}

export function TotalsSection({ total, paymentNote, maintenanceNote }: TotalsSectionProps) {
  return (
    <section className="totals-section mb-12">
      {/* Top divider */}
      <div className="mb-8 border-t border-[var(--p-border)]" />

      <div className="flex items-start justify-between">
        <p className="font-serif text-2xl text-[var(--p-muted)]">Total Estimate</p>
        <div className="text-right">
          <p className="font-serif text-4xl text-[var(--p-accent)]">
            {formatCurrency(total)}
          </p>
          {paymentNote && (
            <p className="mt-2 text-sm text-[var(--p-muted)]">{paymentNote}</p>
          )}
          {maintenanceNote && (
            <p className="text-sm text-[var(--p-muted)]">{maintenanceNote}</p>
          )}
        </div>
      </div>

      {/* Bottom divider */}
      <div className="mt-8 border-t border-[var(--p-border)]" />
    </section>
  )
}
