import type { ProposalContent } from '@/types/database'
import { EditableText } from '../components/EditableText'

interface CoverSectionProps {
  cover: ProposalContent['cover']
  editable?: boolean
  onCoverChange?: (cover: ProposalContent['cover']) => void
}

export function CoverSection({ cover, editable, onCoverChange }: CoverSectionProps) {
  function update(field: keyof ProposalContent['cover'], value: string) {
    onCoverChange?.({ ...cover, [field]: value })
  }

  return (
    <section className="mb-12">
      {/* Date */}
      <p className="mb-3 text-sm text-[#6B6B6B]">
        {editable ? (
          <EditableText value={cover.date} onChange={(v) => update('date', v)} />
        ) : (
          cover.date
        )}
      </p>

      {/* Title row */}
      <div className="flex items-start justify-between">
        <h1 className="font-serif text-4xl text-[#1A1A1A]">
          Project Estimate
        </h1>
        <div className="shrink-0 text-right text-sm text-[#6B6B6B]">
          <p>
            for{' '}
            <span className="font-medium text-[#1A1A1A]">
              {editable ? (
                <EditableText
                  value={cover.client_name}
                  onChange={(v) => update('client_name', v)}
                  placeholder="Client name"
                />
              ) : (
                cover.client_name
              )}
            </span>
          </p>
          <p>
            by <span className="font-medium text-[#1A1A1A]">Cambridge Studio</span>
          </p>
        </div>
      </div>

      {/* Description */}
      {cover.description && (
        <p className="mt-4 text-sm leading-relaxed text-[#4A4A4A]">
          {editable ? (
            <EditableText
              value={cover.description}
              onChange={(v) => update('description', v)}
              multiline
            />
          ) : (
            cover.description
          )}
        </p>
      )}

      {/* Divider */}
      <div className="mt-8 border-t border-[#D4D0C8]" />
    </section>
  )
}
