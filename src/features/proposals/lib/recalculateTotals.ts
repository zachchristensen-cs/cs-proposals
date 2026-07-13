import type { ProposalContent } from '@/types/database'

/**
 * Standard payment schedule: 50% at kickoff, 25% at design approval,
 * 25% at pre-launch sign-off. All percentages are of the total estimate.
 */
const STANDARD_SPLIT = [0.5, 0.25, 0.25]

export function recalculateTotals(proposal: ProposalContent): ProposalContent {
  const updated = structuredClone(proposal)

  // Recalculate each phase subtotal
  // If phase has individual line items with prices, sum those
  // Otherwise use the phase.price directly
  updated.phases = updated.phases.map((phase) => {
    const itemsTotal = phase.items.reduce((sum, item) => sum + item.price, 0)
    const subtotal = itemsTotal > 0 ? itemsTotal : (phase.price ?? phase.subtotal ?? 0)
    return {
      ...phase,
      subtotal,
      price: phase.price ?? subtotal,
    }
  })

  // Recalculate project total from phase subtotals
  updated.total = updated.phases.reduce((sum, phase) => sum + phase.subtotal, 0)

  // Recalculate payment terms.
  // The standard three-term schedule is 50% at kickoff, 25% at design
  // approval, and 25% at pre-launch sign-off, each taken from the total
  // estimate. (The previous even split across terms was a bug: it turned
  // 50/25/25 into 33/33/33 whenever any price was edited.)
  // A non-standard term count preserves the existing proportions, falling
  // back to an even split when all amounts are zero.
  const terms = updated.payment?.terms
  if (terms && terms.length > 0) {
    const currentSum = terms.reduce((sum, t) => sum + (t.amount || 0), 0)
    const ratios =
      terms.length === STANDARD_SPLIT.length
        ? STANDARD_SPLIT
        : currentSum > 0
          ? terms.map((t) => (t.amount || 0) / currentSum)
          : terms.map(() => 1 / terms.length)

    const amounts = ratios.map((r) => Math.round(updated.total * r))
    // Rounding can leave the sum a dollar or two off; put the difference on
    // the first (kickoff) payment so the terms always sum to the total.
    const drift = updated.total - amounts.reduce((sum, a) => sum + a, 0)
    amounts[0] += drift

    updated.payment.terms = terms.map((term, i) => ({
      ...term,
      amount: amounts[i],
    }))
  }

  return updated
}
