import type { ProposalContent } from '@/types/database'

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

  // Recalculate payment terms proportionally
  if (updated.payment?.terms?.length > 0) {
    const termCount = updated.payment.terms.length
    const evenSplit = Math.floor(updated.total / termCount)
    const remainder = updated.total - evenSplit * termCount

    updated.payment.terms = updated.payment.terms.map((term, i) => ({
      ...term,
      amount: evenSplit + (i === 0 ? remainder : 0),
    }))
  }

  return updated
}
