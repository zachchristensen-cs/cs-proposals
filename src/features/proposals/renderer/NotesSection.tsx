import type { ProposalContent } from '@/types/database'

interface NotesSectionProps {
  notes?: ProposalContent['notes']
  timingNote?: string
}

export function NotesSection({ notes, timingNote }: NotesSectionProps) {
  const hasNotes = notes && notes.items.length > 0
  if (!hasNotes && !timingNote) return null

  return (
    <section className="mb-12">
      <h2 className="mb-4 font-serif text-2xl text-[#1A1A1A]">
        Notes & Exclusions
      </h2>

      {hasNotes && (
        <ul className="mb-6 space-y-2">
          {notes.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed text-[#4A4A4A]">
              <span className="mt-2 block size-1 shrink-0 rounded-full bg-[#6B6B6B]" />
              {item}
            </li>
          ))}
        </ul>
      )}

      {timingNote && (
        <div className="border-l-2 border-[#D4D0C8] pl-4">
          <p className="text-sm leading-relaxed text-[#4A4A4A]">
            {timingNote}
          </p>
        </div>
      )}
    </section>
  )
}
