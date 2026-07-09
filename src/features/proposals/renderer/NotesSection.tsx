import type { ProposalContent } from '@/types/database'
import { EditableText } from '../components/EditableText'
import { RemoveButton } from '../components/RemoveButton'
import { AddButton } from '../components/AddButton'

interface NotesSectionProps {
  notes?: ProposalContent['notes']
  timingNote?: string
  editable?: boolean
  onNotesChange?: (notes: ProposalContent['notes']) => void
  onTimingNoteChange?: (timingNote: string | undefined) => void
}

export function NotesSection({ notes, timingNote, editable, onNotesChange, onTimingNoteChange }: NotesSectionProps) {
  const hasNotes = notes && notes.items.length > 0
  if (!hasNotes && !timingNote) return null

  function updateNoteItem(index: number, value: string) {
    if (!notes) return
    const items = notes.items.map((item, i) => (i === index ? value : item))
    onNotesChange?.({ ...notes, items })
  }

  function removeNoteItem(index: number) {
    if (!notes) return
    const items = notes.items.filter((_, i) => i !== index)
    onNotesChange?.({ ...notes, items })
  }

  function addNoteItem() {
    if (!notes) return
    onNotesChange?.({ ...notes, items: [...notes.items, ''] })
  }

  return (
    <section className="mb-12">
      <h2 className="mb-4 font-serif text-2xl text-[var(--p-ink)]">
        Notes & Exclusions
      </h2>

      {hasNotes && (
        <div className="group/list mb-6">
          <ul className="space-y-2">
            {notes.items.map((item, i) => (
              <li key={i} className="group/item flex items-start gap-2.5 text-sm leading-relaxed text-[var(--p-body)]">
                <span className="mt-2 block size-1 shrink-0 rounded-full bg-[var(--p-muted)]" />
                <span className="flex-1">
                  {editable ? (
                    <EditableText
                      value={item}
                      onChange={(v) => updateNoteItem(i, v)}
                      multiline
                    />
                  ) : (
                    item
                  )}
                </span>
                {editable && onNotesChange && (
                  <RemoveButton onRemove={() => removeNoteItem(i)} title="Remove note" />
                )}
              </li>
            ))}
          </ul>
          {editable && onNotesChange && (
            <AddButton onAdd={addNoteItem} label="Add note" />
          )}
        </div>
      )}

      {timingNote && (
        <div className="group/item border-l-2 border-[var(--p-border)] pl-4">
          <div className="flex items-start gap-2">
            <p className="flex-1 text-sm leading-relaxed text-[var(--p-body)]">
              {editable ? (
                <EditableText
                  value={timingNote}
                  onChange={(v) => onTimingNoteChange?.(v)}
                  multiline
                />
              ) : (
                timingNote
              )}
            </p>
            {editable && onTimingNoteChange && (
              <RemoveButton onRemove={() => onTimingNoteChange?.(undefined)} title="Remove timing note" />
            )}
          </div>
        </div>
      )}
    </section>
  )
}
