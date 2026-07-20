import type { ProposalContent, ProposalPackage } from '@/types/database'

/** Stable key for a line item within a proposal: "<phaseIndex>:<itemIndex>" */
export function itemKey(phaseIndex: number, itemIndex: number): string {
  return `${phaseIndex}:${itemIndex}`
}

/** Stable key for an optional phase: "p:<phaseIndex>" */
export function phaseKey(phaseIndex: number): string {
  return `p:${phaseIndex}`
}

/** True when the proposal offers mutually-exclusive packages/tiers to pick from */
export function hasPackages(content: ProposalContent): boolean {
  return (content.packages?.options?.length ?? 0) > 0
}

/**
 * Resolves which package is currently selected. Falls back, in order, to the
 * explicitly selected id, the group's default_id, the recommended option, then
 * the first option. Returns null when the proposal has no packages.
 */
export function resolveSelectedPackage(
  content: ProposalContent,
  selectedPackageId?: string,
): ProposalPackage | null {
  const options = content.packages?.options ?? []
  if (options.length === 0) return null
  return (
    options.find((p) => p.id === selectedPackageId) ??
    options.find((p) => p.id === content.packages?.default_id) ??
    options.find((p) => p.recommended) ??
    options[0]
  )
}

export interface AdjustedTotals {
  subtotal: number
  discountTotal: number
  total: number
  /** Payment term amounts scaled to the adjusted total (same order as content.payment.terms) */
  termAmounts: number[]
}

/** Sum of the priced, still-selected optional line items within a phase. */
function optionalItemsSubtotal(
  phase: NonNullable<ProposalContent['phases']>[number],
  phaseIndex: number,
  deselected: Set<string>,
): number {
  let sum = 0
  ;(phase.items ?? []).forEach((item, ii) => {
    if (item.optional && item.price > 0 && !deselected.has(itemKey(phaseIndex, ii))) {
      sum += item.price
    }
  })
  return sum
}

/** Whole contribution of a phase in the classic (no-package) model. */
function phaseSubtotal(
  phase: NonNullable<ProposalContent['phases']>[number],
  phaseIndex: number,
  deselected: Set<string>,
): number {
  if (phase.optional && deselected.has(phaseKey(phaseIndex))) return 0
  const items = phase.items ?? []
  const pricedItems = items.filter((it) => it.price > 0)
  if (pricedItems.length > 0) {
    let sum = 0
    items.forEach((item, ii) => {
      if (item.optional && deselected.has(itemKey(phaseIndex, ii))) return
      sum += item.price
    })
    return sum
  }
  return phase.price ?? phase.subtotal ?? 0
}

/**
 * Computes proposal totals given the client's selections.
 * `deselected` holds itemKey()/phaseKey()s of optional add-ons the client turned OFF.
 * `selectedPackageId` is the client's chosen package (pick-one proposals).
 *
 * Two shapes are supported and can be combined:
 *   - Package proposals: the selected package's price is the base. Mandatory
 *     phase prices are treated as descriptive scope (not summed); only optional
 *     add-ons on top still count.
 *   - Classic proposals (no packages): every phase price counts, optional
 *     add-ons can be toggled off. (Unchanged behavior.)
 * Discounts apply after selection; payment terms keep their original proportions.
 */
export function computeAdjustedTotals(
  content: ProposalContent,
  deselected: Set<string>,
  selectedPackageId?: string,
): AdjustedTotals {
  const pkg = resolveSelectedPackage(content, selectedPackageId)

  let subtotal = 0
  if (pkg) {
    // Package base price + any optional add-ons layered on top.
    subtotal += pkg.price
    content.phases?.forEach((phase, pi) => {
      if (phase.optional) {
        // An optional whole phase acts as an add-on: include it unless turned off.
        subtotal += phaseSubtotal(phase, pi, deselected)
      } else {
        // Mandatory phases are descriptive here, but optional priced line items
        // inside them are still selectable add-ons.
        subtotal += optionalItemsSubtotal(phase, pi, deselected)
      }
    })
  } else {
    content.phases?.forEach((phase, pi) => {
      subtotal += phaseSubtotal(phase, pi, deselected)
    })
  }

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
