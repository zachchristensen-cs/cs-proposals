import type { ProposalContent } from '@/types/database'
import { EditableText } from '../components/EditableText'

interface CoverSectionProps {
  cover: ProposalContent['cover']
  brandName: string
  editable?: boolean
  onCoverChange?: (cover: ProposalContent['cover']) => void
}

export function CoverSection({ cover, brandName, editable, onCoverChange }: CoverSectionProps) {
  function update(field: keyof ProposalContent['cover'], value: string) {
    onCoverChange?.({ ...cover, [field]: value })
  }

  if (!cover) return null

  return (
    <section className="mb-12">
      {/* Date */}
      <p className="mb-3 text-sm text-[var(--p-muted)]">
        {editable ? (
          <EditableText value={cover.date} onChange={(v) => update('date', v)} />
        ) : (
          cover.date
        )}
      </p>

      {/* Title row */}
      <div className="flex items-start justify-between">
        <h1 className="font-serif text-4xl text-[var(--p-ink)]">
          Project Estimate
        </h1>
        <div className="shrink-0 text-right text-sm text-[var(--p-muted)]">
          <p>
            for{' '}
            <span className="font-medium text-[var(--p-ink)]">
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
            by <span className="font-medium text-[var(--p-ink)]">{brandName}</span>
          </p>
        </div>
      </div>

      {/* Description */}
      {cover.description && (
        <p className="mt-4 text-sm leading-relaxed text-[var(--p-body)]">
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
      <div className="mt-8 border-t border-[var(--p-border)]" />
    </section>
  )
}
