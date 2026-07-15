import type { ProposalContent } from '@/types/database'

/** Stable key for a line item within a proposal: "<phaseIndex>:<itemIndex>" */
export function itemKey(phaseIndex: number, itemIndex: number): string {
  return `${phaseIndex}:${itemIndex}`
}

/** Stable key for an optional phase: "p:<phaseIndex>" */
export function phaseKey(phaseIndex: number): string {
  return `p:${phaseIndex}`
}

export interface AdjustedTotals {
  subtotal: number
  discountTotal: number
  total: number
  /** Payment term amounts scaled to the adjusted total (same order as content.payment.terms) */
  termAmounts: number[]
}

/**
 * Computes proposal totals given the client's optional-item selections.
 * `deselected` holds itemKey()s of optional items the client turned OFF.
 * Non-optional items always count. Discounts apply after item selection.
 * Payment terms keep their original proportions of the total.
 */
export function computeAdjustedTotals(
  content: ProposalContent,
  deselected: Set<string>,
): AdjustedTotals {
  let subtotal = 0
  content.phases?.forEach((phase, pi) => {
    if (phase.optional && deselected.has(phaseKey(pi))) return
    const items = phase.items ?? []
    const pricedItems = items.filter((it) => it.price > 0)
    if (pricedItems.length > 0) {
      items.forEach((item, ii) => {
        if (item.optional && deselected.has(itemKey(pi, ii))) return
        subtotal += item.price
      })
    } else {
      subtotal += phase.price ?? phase.subtotal ?? 0
    }
  })

  let discountTotal = 0
  for (const d of content.discounts ?? []) {
    if (d.amount && d.amount > 0) discountTotal += d.amount
    else if (d.percent && d.percent > 0) discountTotal += Math.round((subtotal * d.percent) / 100)
  }
  discountTotal = Math.min(discountTotal, subtotal)

  const total = subtotal - discountTotal

  const terms = content.payment?.terms ?? []
  const originalSum = terms.reduce((s, t) => s + (t.amount || 0), 0)
  let allocated = 0
  const termAmounts = terms.map((t, i) => {
    if (i === terms.length - 1) return Math.max(0, total - allocated)
    const ratio = originalSum > 0 ? (t.amount || 0) / originalSum : 1 / (terms.length || 1)
    const amt = Math.round(total * ratio)
    allocated += amt
    return amt
  })

  return { subtotal, discountTotal, total, termAmounts }
}

/** True when any phase is optional or has an optional priced line item */
export function hasSelectableItems(content: ProposalContent): boolean {
  return (content.phases ?? []).some(
    (phase) => phase.optional || (phase.items ?? []).some((it) => it.optional && it.price > 0),
  )
}
