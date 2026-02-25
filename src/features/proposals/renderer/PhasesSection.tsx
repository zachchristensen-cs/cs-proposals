import type { ProposalPhase } from '@/types/database'
import { formatCurrency } from '../lib/formatCurrency'
import { EditableText } from '../components/EditableText'
import { EditablePrice } from '../components/EditablePrice'

interface PhasesSectionProps {
  phases: ProposalPhase[]
  sectionNumber: number
  editable?: boolean
  hideNumber?: boolean
  hidePricing?: boolean
  onPhasesChange?: (phases: ProposalPhase[]) => void
}

export function PhasesSection({
  phases,
  sectionNumber,
  editable,
  hideNumber,
  hidePricing,
  onPhasesChange,
}: PhasesSectionProps) {
  function updatePhase(phaseIndex: number, updates: Partial<ProposalPhase>) {
    const updated = phases.map((p, i) => (i === phaseIndex ? { ...p, ...updates } : p))
    onPhasesChange?.(updated)
  }

  function updatePhasePrice(phaseIndex: number, price: number) {
    updatePhase(phaseIndex, { price, subtotal: price })
  }

  function updateLineItemPrice(phaseIndex: number, itemIndex: number, price: number) {
    const phase = phases[phaseIndex]
    const items = phase.items.map((item, j) => (j === itemIndex ? { ...item, price } : item))
    const subtotal = items.reduce((sum, item) => sum + item.price, 0)
    updatePhase(phaseIndex, { items, subtotal })
  }

  function updateLineItemText(
    phaseIndex: number,
    itemIndex: number,
    field: 'name' | 'description',
    value: string,
  ) {
    const phase = phases[phaseIndex]
    const items = phase.items.map((item, j) =>
      j === itemIndex ? { ...item, [field]: value } : item,
    )
    updatePhase(phaseIndex, { items })
  }

  return (
    <>
      {phases.map((phase, i) => {
        const num = sectionNumber + i
        // Use groups format if available, otherwise fall back to line items
        const hasGroups = phase.groups && phase.groups.length > 0
        const hasLineItems = phase.items && phase.items.length > 0

        return (
          <section key={i} className="mb-12">
            {/* Section number + title with price */}
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                {!hideNumber && (
                  <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-[#D4D0C8] text-xs text-[#6B6B6B]">
                    {num}
                  </span>
                )}
                <h2 className="font-serif text-2xl text-[#1A1A1A]">
                  {editable ? (
                    <EditableText
                      value={phase.name}
                      onChange={(v) => updatePhase(i, { name: v })}
                      placeholder="Phase name"
                    />
                  ) : (
                    phase.name
                  )}
                </h2>
              </div>
              {!hidePricing && (
                <span className="shrink-0 font-serif text-2xl text-[#1A1A1A]">
                  {editable ? (
                    <EditablePrice
                      value={phase.price ?? phase.subtotal}
                      onChange={(v) => updatePhasePrice(i, v)}
                    />
                  ) : (
                    formatCurrency(phase.price ?? phase.subtotal)
                  )}
                </span>
              )}
            </div>

            {/* Narrative */}
            {phase.narrative && (
              <p className={`mb-6 text-sm leading-relaxed text-[#4A4A4A] ${hideNumber ? '' : 'pl-11'}`}>
                {editable ? (
                  <EditableText
                    value={phase.narrative}
                    onChange={(v) => updatePhase(i, { narrative: v })}
                    multiline
                  />
                ) : (
                  phase.narrative
                )}
              </p>
            )}

            {/* Groups format (Vend Park style — sub-headings with bullet lists) */}
            {hasGroups && (
              <div className={`space-y-5 ${hideNumber ? '' : 'pl-11'}`}>
                {phase.groups!.map((group, g) => (
                  <div key={g}>
                    <p className="mb-2 text-sm font-medium text-[#4A4A4A]">
                      {group.name}
                    </p>
                    <ul className="space-y-1.5">
                      {group.items.map((item, k) => (
                        <li
                          key={k}
                          className="flex items-start gap-2.5 text-sm leading-relaxed text-[#4A4A4A]"
                        >
                          <span className="mt-2 block size-1 shrink-0 rounded-full bg-[#4A4A4A]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Line items format (Tier 2/3 with individual pricing) */}
            {!hasGroups && hasLineItems && (
              <div className={hideNumber ? '' : 'pl-11'}>
                {phase.items.map((item, j) => (
                  <div
                    key={j}
                    className="flex items-start justify-between border-b border-[#D4D0C8] py-3 last:border-b-0"
                  >
                    <div className="mr-4 flex-1">
                      <span className="text-sm font-medium text-[#1A1A1A]">
                        {editable ? (
                          <EditableText
                            value={item.name}
                            onChange={(v) => updateLineItemText(i, j, 'name', v)}
                            placeholder="Item name"
                          />
                        ) : (
                          item.name
                        )}
                      </span>
                      {item.description && (
                        <p className="mt-0.5 text-sm text-[#6B6B6B]">
                          {editable ? (
                            <EditableText
                              value={item.description}
                              onChange={(v) => updateLineItemText(i, j, 'description', v)}
                              multiline
                            />
                          ) : (
                            item.description
                          )}
                        </p>
                      )}
                    </div>
                    {!hidePricing && (
                      <span className="shrink-0 text-sm text-[#1A1A1A]">
                        {editable ? (
                          <EditablePrice
                            value={item.price}
                            onChange={(v) => updateLineItemPrice(i, j, v)}
                          />
                        ) : (
                          formatCurrency(item.price)
                        )}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
