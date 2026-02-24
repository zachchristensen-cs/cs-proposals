import type { ProposalContent } from '@/types/database'

interface MaintenanceSectionProps {
  maintenance: NonNullable<ProposalContent['maintenance']>
  sectionNumber: number
  hideNumber?: boolean
}

export function MaintenanceSection({ maintenance, sectionNumber, hideNumber }: MaintenanceSectionProps) {
  // Calculate the price range for the header
  const prices = maintenance.tiers
    .map((t) => t.price)
    .filter(Boolean)

  return (
    <section className="mb-12">
      {/* Section number + title with price range */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          {!hideNumber && (
            <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-[#D4D0C8] text-xs text-[#6B6B6B]">
              {sectionNumber}
            </span>
          )}
          <h2 className="font-serif text-2xl text-[#1A1A1A]">
            Maintenance
          </h2>
        </div>
        {prices.length >= 2 && (
          <span className="shrink-0 font-serif text-2xl text-[#1A1A1A]">
            + {prices[0]} – {prices[prices.length - 1]}
          </span>
        )}
      </div>

      {/* Tiers as simple rows */}
      <div className={`space-y-3 ${hideNumber ? '' : 'pl-11'}`}>
        {maintenance.tiers.map((tier, i) => (
          <div key={i} className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-[#1A1A1A]">{tier.name}</span>
              <span className="text-sm text-[#6B6B6B]">{tier.summary}</span>
            </div>
            <span className="shrink-0 text-sm text-[#1A1A1A]">{tier.price}</span>
          </div>
        ))}
      </div>

      {maintenance.recommendation && (
        <p className={`mt-6 text-sm leading-relaxed text-[#4A4A4A] ${hideNumber ? '' : 'pl-11'}`}>
          {maintenance.recommendation}
        </p>
      )}
    </section>
  )
}
