import type { ProposalContent } from '@/types/database'
import { EditableText } from '../components/EditableText'
import { RemoveButton } from '../components/RemoveButton'
import { AddButton } from '../components/AddButton'

interface MaintenanceSectionProps {
  maintenance: NonNullable<ProposalContent['maintenance']>
  sectionNumber: number
  hideNumber?: boolean
  hidePricing?: boolean
  editable?: boolean
  onMaintenanceChange?: (maintenance: NonNullable<ProposalContent['maintenance']>) => void
}

export function MaintenanceSection({ maintenance, sectionNumber, hideNumber, hidePricing, editable, onMaintenanceChange }: MaintenanceSectionProps) {
  // Calculate the price range for the header
  const prices = maintenance.tiers
    .map((t) => t.price)
    .filter(Boolean)

  function updateTier(index: number, field: string, value: string) {
    const tiers = maintenance.tiers.map((t, i) =>
      i === index ? { ...t, [field]: value } : t,
    )
    onMaintenanceChange?.({ ...maintenance, tiers })
  }

  function removeTier(index: number) {
    const tiers = maintenance.tiers.filter((_, i) => i !== index)
    onMaintenanceChange?.({ ...maintenance, tiers })
  }

  function addTier() {
    const tiers = [...maintenance.tiers, { name: '', price: '', summary: '', description: '' }]
    onMaintenanceChange?.({ ...maintenance, tiers })
  }

  return (
    <section className="mb-12">
      {/* Section number + title with price range */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          {!hideNumber && (
            <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--p-border)] text-xs text-[var(--p-muted)]">
              {sectionNumber}
            </span>
          )}
          <h2 className="font-serif text-2xl text-[var(--p-ink)]">
            Maintenance
          </h2>
        </div>
        {!hidePricing && prices.length >= 2 && (
          <span className="shrink-0 font-serif text-2xl text-[var(--p-accent)]">
            + {prices[0]} – {prices[prices.length - 1]}
          </span>
        )}
      </div>

      {/* Tiers as simple rows */}
      <div className={`group/list space-y-3 ${hideNumber ? '' : 'pl-11'}`}>
        {maintenance.tiers.map((tier, i) => (
          <div key={i} className="group/item flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-[var(--p-ink)]">
                {editable ? (
                  <EditableText value={tier.name} onChange={(v) => updateTier(i, 'name', v)} />
                ) : (
                  tier.name
                )}
              </span>
              <span className="text-sm text-[var(--p-muted)]">
                {editable ? (
                  <EditableText value={tier.summary} onChange={(v) => updateTier(i, 'summary', v)} />
                ) : (
                  tier.summary
                )}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              {!hidePricing && (
                <span className="shrink-0 text-sm text-[var(--p-ink)]">
                  {editable ? (
                    <EditableText value={tier.price} onChange={(v) => updateTier(i, 'price', v)} />
                  ) : (
                    tier.price
                  )}
                </span>
              )}
              {editable && onMaintenanceChange && (
                <RemoveButton onRemove={() => removeTier(i)} title="Remove tier" />
              )}
            </div>
          </div>
        ))}
        {editable && onMaintenanceChange && (
          <AddButton onAdd={addTier} label="Add tier" />
        )}
      </div>

      {maintenance.recommendation && (
        <div className={`group/item mt-6 flex items-start gap-2 ${hideNumber ? '' : 'pl-11'}`}>
          <p className="flex-1 text-sm leading-relaxed text-[var(--p-body)]">
            {editable ? (
              <EditableText
                value={maintenance.recommendation}
                onChange={(v) => onMaintenanceChange?.({ ...maintenance, recommendation: v })}
                multiline
              />
            ) : (
              maintenance.recommendation
            )}
          </p>
          {editable && onMaintenanceChange && (
            <RemoveButton
              onRemove={() => onMaintenanceChange?.({ ...maintenance, recommendation: undefined })}
              title="Remove recommendation"
            />
          )}
        </div>
      )}
    </section>
  )
}
