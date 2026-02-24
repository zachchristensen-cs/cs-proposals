import type { ProposalContent } from '@/types/database'
import { EditableText } from '../components/EditableText'

interface OpportunitySectionProps {
  opportunity: NonNullable<ProposalContent['opportunity']>
  editable?: boolean
  onOpportunityChange?: (opportunity: NonNullable<ProposalContent['opportunity']>) => void
}

export function OpportunitySection({
  opportunity,
  editable,
  onOpportunityChange,
}: OpportunitySectionProps) {
  function updateParagraph(index: number, value: string) {
    const updated = [...opportunity.paragraphs]
    updated[index] = value
    onOpportunityChange?.({ ...opportunity, paragraphs: updated })
  }

  return (
    <section className="mb-12">
      <h2 className="mb-4 font-serif text-2xl text-[#1A1A1A]">
        The Opportunity
      </h2>
      <div className="space-y-4">
        {opportunity.paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-[#4A4A4A]">
            {editable ? (
              <EditableText
                value={p}
                onChange={(v) => updateParagraph(i, v)}
                multiline
              />
            ) : (
              p
            )}
          </p>
        ))}
      </div>
    </section>
  )
}
