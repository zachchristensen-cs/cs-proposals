import type { ProposalDiscount } from '@/types/database'
import { formatCurrency } from '../lib/formatCurrency'
import { EditableText } from '../components/EditableText'
import { EditablePrice } from '../components/EditablePrice'
import { RemoveButton } from '../components/RemoveButton'
import { AddButton } from '../components/AddButton'

interface TotalsSectionProps {
  total: number
  paymentNote?: string
  maintenanceNote?: string
  /** Retainer proposals show the amount as recurring */
  isRetainer?: boolean
  /** e.g. "/mo", "/qtr" - shown after the amount for retainers */
  retainerSuffix?: string
  /** Pre-discount subtotal; shown when discounts exist */
  subtotal?: number
  discounts?: ProposalDiscount[]
  discountTotal?: number
  editable?: boolean
  onDiscountsChange?: (discounts: ProposalDiscount[]) => void
}

export function TotalsSection({
  total,
  paymentNote,
  maintenanceNote,
  isRetainer,
  retainerSuffix,
  subtotal,
  discounts,
  discountTotal,
  editable,
  onDiscountsChange,
}: TotalsSectionProps) {
  const hasDiscounts = (discounts?.length ?? 0) > 0

  function updateDiscount(index: number, updates: Partial<ProposalDiscount>) {
    if (!discounts) return
    onDiscountsChange?.(discounts.map((d, i) => (i === index ? { ...d, ...updates } : d)))
  }

  function removeDiscount(index: number) {
    onDiscountsChange?.((discounts ?? []).filter((_, i) => i !== index))
  }

  function addDiscount() {
    onDiscountsChange?.([...(discounts ?? []), { label: 'Discount', amount: 0 }])
  }

  return (
    <section className="totals-section mb-12">
      {/* Top divider */}
      <div className="mb-8 border-t border-[var(--p-border)]" />

      {hasDiscounts && subtotal !== undefined && (
        <div className="group/list mb-4 space-y-1.5">
          <div className="flex items-baseline justify-between text-sm text-[var(--p-muted)]">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discounts!.map((d, i) => (
            <div key={i} className="group/item flex items-baseline justify-between text-sm text-[var(--p-muted)]">
              <span className="flex items-center gap-2">
                {editable && onDiscountsChange ? (
                  <EditableText value={d.label} onChange={(v) => updateDiscount(i, { label: v })} placeholder="Discount" />
                ) : (
                  d.label
                )}
                {d.percent && !d.amount ? ` (${d.percent}%)` : ''}
                {editable && onDiscountsChange && (
                  <RemoveButton onRemove={() => removeDiscount(i)} title="Remove discount" />
                )}
              </span>
              <span>
                {editable && onDiscountsChange && !d.percent ? (
                  <span className="inline-flex items-center gap-1">
                    -<EditablePrice value={d.amount ?? 0} onChange={(v) => updateDiscount(i, { amount: v, percent: undefined })} />
                  </span>
                ) : (
                  `-${formatCurrency(
                    d.amount && d.amount > 0
                      ? d.amount
                      : Math.round(((subtotal ?? 0) * (d.percent ?? 0)) / 100),
                  )}`
                )}
              </span>
            </div>
          ))}
        </div>
      )}
      {editable && onDiscountsChange && (
        <div className="mb-4 print:hidden">
          <AddButton onAdd={addDiscount} label="Add discount" />
        </div>
      )}

      <div className="flex items-start justify-between">
        <p className="font-serif text-2xl text-[var(--p-muted)]">
          {isRetainer ? 'Retainer' : 'Total Estimate'}
        </p>
        <div className="text-right">
          <p className="font-serif text-4xl text-[var(--p-accent)]">
            {formatCurrency(total)}
            {isRetainer && (
              <span className="text-2xl text-[var(--p-muted)]">{retainerSuffix ?? '/mo'}</span>
            )}
          </p>
          {hasDiscounts && (discountTotal ?? 0) > 0 && (
            <p className="mt-1 text-sm text-[var(--p-muted)]">
              You save {formatCurrency(discountTotal!)}
            </p>
          )}
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
