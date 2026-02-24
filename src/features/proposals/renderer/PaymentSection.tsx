import type { ProposalContent } from '@/types/database'
import { formatCurrency } from '../lib/formatCurrency'
import { EditableText } from '../components/EditableText'
import { EditablePrice } from '../components/EditablePrice'

interface PaymentSectionProps {
  payment: ProposalContent['payment']
  editable?: boolean
  onPaymentChange?: (payment: ProposalContent['payment']) => void
}

export function PaymentSection({
  payment,
  editable,
  onPaymentChange,
}: PaymentSectionProps) {
  function updateTerm(index: number, field: string, value: string | number) {
    const terms = payment.terms.map((t, i) =>
      i === index ? { ...t, [field]: value } : t,
    )
    onPaymentChange?.({ ...payment, terms })
  }

  return (
    <section className="mb-12">
      <div className="space-y-3">
        {payment.terms.map((term, i) => (
          <div
            key={i}
            className="flex items-baseline justify-between"
          >
            <div className="mr-4">
              <span className="text-sm font-medium text-[#1A1A1A]">
                {editable ? (
                  <EditableText
                    value={term.label}
                    onChange={(v) => updateTerm(i, 'label', v)}
                  />
                ) : (
                  term.label
                )}
              </span>
              {term.description && (
                <span className="ml-2 text-sm text-[#6B6B6B]">
                  {editable ? (
                    <EditableText
                      value={term.description}
                      onChange={(v) => updateTerm(i, 'description', v)}
                    />
                  ) : (
                    term.description
                  )}
                </span>
              )}
            </div>
            <span className="shrink-0 text-sm text-[#1A1A1A]">
              {editable ? (
                <EditablePrice
                  value={term.amount}
                  onChange={(v) => updateTerm(i, 'amount', v)}
                />
              ) : (
                formatCurrency(term.amount)
              )}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
