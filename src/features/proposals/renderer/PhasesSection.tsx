import type { ProposalPhase } from '@/types/database'
import { formatCurrency } from '../lib/formatCurrency'
import { EditableText } from '../components/EditableText'
import { EditablePrice } from '../components/EditablePrice'
import { RemoveButton } from '../components/RemoveButton'
import { AddButton } from '../components/AddButton'

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

  function removePhase(phaseIndex: number) {
    onPhasesChange?.(phases.filter((_, i) => i !== phaseIndex))
  }

  function updatePhasePrice(phaseIndex: number, price: number) {
    updatePhase(phaseIndex, { price, subtotal: price })
  }

  function updateGroupName(phaseIndex: number, groupIndex: number, name: string) {
    const phase = phases[phaseIndex]
    const groups = phase.groups!.map((g, j) => (j === groupIndex ? { ...g, name } : g))
    updatePhase(phaseIndex, { groups })
  }

  function updateGroupItem(phaseIndex: number, groupIndex: number, itemIndex: number, value: string) {
    const phase = phases[phaseIndex]
    const groups = phase.groups!.map((g, j) => {
      if (j !== groupIndex) return g
      const items = g.items.map((item, k) => (k === itemIndex ? value : item))
      return { ...g, items }
    })
    updatePhase(phaseIndex, { groups })
  }

  function removeGroupItem(phaseIndex: number, groupIndex: number, itemIndex: number) {
    const phase = phases[phaseIndex]
    const groups = phase.groups!.map((g, j) => {
      if (j !== groupIndex) return g
      return { ...g, items: g.items.filter((_, k) => k !== itemIndex) }
    })
    updatePhase(phaseIndex, { groups })
  }

  function removeGroup(phaseIndex: number, groupIndex: number) {
    const phase = phases[phaseIndex]
    const groups = phase.groups!.filter((_, j) => j !== groupIndex)
    updatePhase(phaseIndex, { groups })
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

  function removeLineItem(phaseIndex: number, itemIndex: number) {
    const phase = phases[phaseIndex]
    const items = phase.items.filter((_, j) => j !== itemIndex)
    const subtotal = items.reduce((sum, item) => sum + item.price, 0)
    updatePhase(phaseIndex, { items, subtotal })
  }

  function addGroupItem(phaseIndex: number, groupIndex: number) {
    const phase = phases[phaseIndex]
    const groups = phase.groups!.map((g, j) =>
      j === groupIndex ? { ...g, items: [...g.items, ''] } : g,
    )
    updatePhase(phaseIndex, { groups })
  }

  function addGroup(phaseIndex: number) {
    const phase = phases[phaseIndex]
    const groups = [...(phase.groups || []), { name: 'New Group', items: [''] }]
    updatePhase(phaseIndex, { groups })
  }

  function addLineItem(phaseIndex: number) {
    const phase = phases[phaseIndex]
    const items = [...phase.items, { name: '', description: '', price: 0 }]
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
            <div className="group/item mb-6 flex items-start justify-between">
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
                {editable && onPhasesChange && (
                  <RemoveButton onRemove={() => removePhase(i)} title="Remove phase" />
                )}
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
              <div className={`group/list space-y-5 ${hideNumber ? '' : 'pl-11'}`}>
                {phase.groups!.map((group, g) => (
                  <div key={g}>
                    <div className="group/item mb-2 flex items-center gap-2">
                      <p className="text-sm font-medium text-[#4A4A4A]">
                        {editable ? (
                          <EditableText
                            value={group.name}
                            onChange={(v) => updateGroupName(i, g, v)}
                            placeholder="Group name"
                          />
                        ) : (
                          group.name
                        )}
                      </p>
                      {editable && onPhasesChange && (
                        <RemoveButton onRemove={() => removeGroup(i, g)} title="Remove group" />
                      )}
                    </div>
                    <div className="group/list">
                      <ul className="space-y-1.5">
                        {group.items.map((item, k) => (
                          <li
                            key={k}
                            className="group/item flex items-start gap-2.5 text-sm leading-relaxed text-[#4A4A4A]"
                          >
                            <span className="mt-2 block size-1 shrink-0 rounded-full bg-[#4A4A4A]" />
                            <span className="flex-1">
                              {editable ? (
                                <EditableText
                                  value={item}
                                  onChange={(v) => updateGroupItem(i, g, k, v)}
                                />
                              ) : (
                                item
                              )}
                            </span>
                            {editable && onPhasesChange && (
                              <RemoveButton onRemove={() => removeGroupItem(i, g, k)} title="Remove item" />
                            )}
                          </li>
                        ))}
                      </ul>
                      {editable && onPhasesChange && (
                        <AddButton onAdd={() => addGroupItem(i, g)} label="Add item" />
                      )}
                    </div>
                  </div>
                ))}
                {editable && onPhasesChange && (
                  <AddButton onAdd={() => addGroup(i)} label="Add group" />
                )}
              </div>
            )}

            {/* Line items format (Tier 2/3 with individual pricing) */}
            {!hasGroups && hasLineItems && (
              <div className={`group/list ${hideNumber ? '' : 'pl-11'}`}>
                {phase.items.map((item, j) => (
                  <div
                    key={j}
                    className="group/item flex items-start justify-between border-b border-[#D4D0C8] py-3 last:border-b-0"
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
                    {editable && onPhasesChange && (
                      <RemoveButton onRemove={() => removeLineItem(i, j)} title="Remove item" className="ml-2" />
                    )}
                  </div>
                ))}
                {editable && onPhasesChange && (
                  <AddButton onAdd={() => addLineItem(i)} label="Add line item" />
                )}
              </div>
            )}
          </section>
        )
      })}
    </>
  )
}
