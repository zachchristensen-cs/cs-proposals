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
      <div className="mb-8 border-t border-[#D4D0C8]" />

      <div className="flex items-start justify-between">
        <p className="font-serif text-2xl text-[#6B6B6B]">Total Estimate</p>
        <div className="text-right">
          <p className="font-serif text-4xl text-[#1A1A1A]">
            {formatCurrency(total)}
          </p>
          {paymentNote && (
            <p className="mt-2 text-sm text-[#6B6B6B]">{paymentNote}</p>
          )}
          {maintenanceNote && (
            <p className="text-sm text-[#6B6B6B]">{maintenanceNote}</p>
          )}
        </div>
      </div>

      {/* Bottom divider */}
      <div className="mt-8 border-t border-[#D4D0C8]" />
    </section>
  )
}
