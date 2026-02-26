import type { ProposalContent } from '@/types/database'
import { EditableText } from '../components/EditableText'
import { RemoveButton } from '../components/RemoveButton'
import { AddButton } from '../components/AddButton'

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

  function removeParagraph(index: number) {
    const paragraphs = opportunity.paragraphs.filter((_, i) => i !== index)
    onOpportunityChange?.({ ...opportunity, paragraphs })
  }

  function addParagraph() {
    onOpportunityChange?.({ ...opportunity, paragraphs: [...opportunity.paragraphs, ''] })
  }

  return (
    <section className="mb-12">
      <h2 className="mb-4 font-serif text-2xl text-[#1A1A1A]">
        The Opportunity
      </h2>
      <div className="group/list space-y-4">
        {opportunity.paragraphs.map((p, i) => (
          <div key={i} className="group/item flex items-start gap-2">
            <p className="flex-1 text-sm leading-relaxed text-[#4A4A4A]">
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
            {editable && onOpportunityChange && (
              <RemoveButton onRemove={() => removeParagraph(i)} title="Remove paragraph" />
            )}
          </div>
        ))}
        {editable && onOpportunityChange && (
          <AddButton onAdd={addParagraph} label="Add paragraph" />
        )}
      </div>
    </section>
  )
}
