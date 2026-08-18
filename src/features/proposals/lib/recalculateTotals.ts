import type { ProposalContent } from '@/types/database'
import { computeAdjustedTotals, allOptionalKeys } from './selection'

/**
 * Standard payment schedule for project proposals: 50% at kickoff, 25% at
 * design approval, 25% at pre-launch sign-off. All percentages are of the
 * total estimate. Retainer proposals never use this split.
 */
const STANDARD_SPLIT = [0.5, 0.25, 0.25]

export function recalculateTotals(proposal: ProposalContent): ProposalContent {
  const updated = structuredClone(proposal)

  // Recalculate each phase subtotal
  // If phase has individual line items with prices, sum those
  // Otherwise use the phase.price directly
  updated.phases = (updated.phases ?? []).map((phase) => {
    const itemsTotal = (phase.items ?? []).reduce((sum, item) => sum + item.price, 0)
    const subtotal = itemsTotal > 0 ? itemsTotal : (phase.price ?? phase.subtotal ?? 0)
    return {
      ...phase,
      subtotal,
      price: phase.price ?? subtotal,
    }
  })

  // Project total. computeAdjustedTotals is the single source of truth for
  // pricing semantics: package proposals use the default option's price as
  // the base (mandatory phases are descriptive scope, NOT summed) and
  // discounts are subtracted. Optional add-ons are OPT-IN: the quoted total
  // is the base scope only; add-ons are charged only when the client selects
  // them on the public page.
  updated.total = computeAdjustedTotals(updated, allOptionalKeys(updated)).total

  // Recalculate payment terms.
  // Project proposals with the standard three terms use 50% at kickoff, 25%
  // at design approval, and 25% at pre-launch sign-off, each taken from the
  // total estimate. Retainer proposals and non-standard term counts preserve
  // their existing proportions, falling back to an even split when all
  // amounts are zero.
  const terms = updated.payment?.terms
  if (terms && terms.length > 0) {
    const isRetainer = updated.proposal_type === 'retainer'
    const currentSum = terms.reduce((sum, t) => sum + (t.amount || 0), 0)
    const ratios =
      !isRetainer && terms.length === STANDARD_SPLIT.length
        ? STANDARD_SPLIT
        : currentSum > 0
          ? terms.map((t) => (t.amount || 0) / currentSum)
          : terms.map(() => 1 / terms.length)

    // Round each term; the last term absorbs rounding drift so the schedule
    // always sums exactly to the total.
    let allocated = 0
    const amounts = ratios.map((r, i) => {
      if (i === ratios.length - 1) return Math.max(0, updated.total - allocated)
      const amt = Math.round(updated.total * r)
      allocated += amt
      return amt
    })

    updated.payment.terms = terms.map((term, i) => ({
      ...term,
      amount: amounts[i],
    }))
  }

  return updated
}
