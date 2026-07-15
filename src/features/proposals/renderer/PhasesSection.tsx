import type { ProposalPhase } from '@/types/database'
import { itemKey, phaseKey } from '../lib/selection'
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
  /** Public page: render optional items with checkboxes */
  selectable?: boolean
  /** itemKey()s of optional items the viewer has turned off */
  deselected?: Set<string>
  onToggleItem?: (key: string) => void
}

export function PhasesSection({
  phases,
  sectionNumber,
  editable,
  hideNumber,
  hidePricing,
  onPhasesChange,
  selectable,
  deselected,
  onToggleItem,
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

  function toggleLineItemOptional(phaseIndex: number, itemIndex: number) {
    const phase = phases[phaseIndex]
    const items = phase.items.map((item, j) =>
      j === itemIndex ? { ...item, optional: !item.optional } : item,
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

        const pKey = phaseKey(i)
        const phaseOff = !!(phase.optional && deselected?.has(pKey))

        return (
          <section key={i} className={`mb-12 ${phaseOff ? 'opacity-45' : ''}`}>
            {/* Section number + title with price */}
            <div className="group/item mb-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                {selectable && phase.optional && (
                  <input
                    type="checkbox"
                    checked={!phaseOff}
                    onChange={() => onToggleItem?.(pKey)}
                    className="mt-2 size-4 shrink-0 cursor-pointer accent-[var(--p-ink)]"
                    aria-label={`Include ${phase.name}`}
                  />
                )}
                {!hideNumber && (
                  <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--p-border)] text-xs text-[var(--p-muted)]">
                    {num}
                  </span>
                )}
                <h2 className="font-serif text-2xl text-[var(--p-ink)]">
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
                {phase.optional && !selectable && (
                  <span className="mt-2 text-xs uppercase tracking-wide text-[var(--p-muted)]">Optional</span>
                )}
                {editable && onPhasesChange && (
                  <>
                    <button
                      type="button"
                      onClick={() => updatePhase(i, { optional: !phase.optional })}
                      className={`mt-2 shrink-0 text-xs opacity-0 transition-opacity group-hover/item:opacity-100 print:hidden ${
                        phase.optional ? 'text-[var(--p-accent)]' : 'text-[var(--p-muted)]'
                      }`}
                      title={phase.optional ? 'Client can toggle this phase. Click to make required.' : 'Click to let the client toggle this whole phase on/off'}
                    >
                      {phase.optional ? 'Optional ✓' : 'Make optional'}
                    </button>
                    <RemoveButton onRemove={() => removePhase(i)} title="Remove phase" />
                  </>
                )}
              </div>
              {!hidePricing && !phase.hide_price && (
                <span className="flex shrink-0 items-center gap-1.5 font-serif text-2xl text-[var(--p-accent)]">
                  {editable ? (
                    <EditablePrice
                      value={phase.price ?? phase.subtotal}
                      onChange={(v) => updatePhasePrice(i, v)}
                    />
                  ) : (
                    formatCurrency(phase.price ?? phase.subtotal)
                  )}
                  {editable && onPhasesChange && (
                    <RemoveButton
                      onRemove={() => updatePhase(i, { hide_price: true })}
                      title="Hide price (still counts toward total)"
                    />
                  )}
                </span>
              )}
              {!hidePricing && phase.hide_price && editable && onPhasesChange && (
                <button
                  type="button"
                  onClick={() => updatePhase(i, { hide_price: false })}
                  className="shrink-0 self-center text-xs text-[var(--p-muted)] underline decoration-[var(--p-border)] underline-offset-2 opacity-0 transition-opacity hover:text-[var(--p-ink)] group-hover/item:opacity-100 print:hidden"
                  title="Price is hidden from the client but still counts toward the total"
                >
                  Show price
                </button>
              )}
            </div>

            {/* Narrative */}
            {phase.narrative && (
              <p className={`mb-6 text-sm leading-relaxed text-[var(--p-body)] ${hideNumber ? '' : 'pl-11'}`}>
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
                      <p className="text-sm font-medium text-[var(--p-body)]">
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
                            className="group/item flex items-start gap-2.5 text-sm leading-relaxed text-[var(--p-body)]"
                          >
                            <span className="mt-2 block size-1 shrink-0 rounded-full bg-[var(--p-body)]" />
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
                {phase.items.map((item, j) => {
                  const key = itemKey(i, j)
                  const isOff = !!(item.optional && deselected?.has(key))
                  return (
                  <div
                    key={j}
                    className={`group/item flex items-start justify-between border-b border-[var(--p-border)] py-3 last:border-b-0 ${isOff ? 'opacity-45' : ''}`}
                  >
                    {selectable && item.optional && (
                      <input
                        type="checkbox"
                        checked={!isOff}
                        onChange={() => onToggleItem?.(key)}
                        className="mr-3 mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--p-ink)]"
                        aria-label={`Include ${item.name}`}
                      />
                    )}
                    <div className="mr-4 flex-1">
                      <span className="text-sm font-medium text-[var(--p-ink)]">
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
                      {item.optional && !selectable && (
                        <span className="ml-2 text-xs uppercase tracking-wide text-[var(--p-muted)]">Optional</span>
                      )}
                      {item.description && (
                        <p className="mt-0.5 text-sm text-[var(--p-muted)]">
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
                      <span className="shrink-0 text-sm text-[var(--p-ink)]">
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
                      <>
                        <button
                          type="button"
                          onClick={() => toggleLineItemOptional(i, j)}
                          className={`ml-2 shrink-0 text-xs opacity-0 transition-opacity group-hover/item:opacity-100 print:hidden ${
                            item.optional ? 'text-[var(--p-accent)]' : 'text-[var(--p-muted)]'
                          }`}
                          title={item.optional ? 'Client can toggle this item. Click to make required.' : 'Click to let the client toggle this item on/off'}
                        >
                          {item.optional ? 'Optional ✓' : 'Make optional'}
                        </button>
                        <RemoveButton onRemove={() => removeLineItem(i, j)} title="Remove item" className="ml-2" />
                      </>
                    )}
                  </div>
                  )
                })}
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
