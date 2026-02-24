import type { ProposalContent } from '@/types/database'

interface PersonasSectionProps {
  personas: NonNullable<ProposalContent['personas']>
}

export function PersonasSection({ personas }: PersonasSectionProps) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-serif text-2xl text-[#1A1A1A]">
        Who We're Designing For
      </h2>

      {personas.intro && (
        <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A]">
          {personas.intro}
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {personas.items.map((persona, i) => (
          <div key={i}>
            <h3 className="mb-1 text-sm font-medium text-[#1A1A1A]">
              {persona.title}
            </h3>
            <p className="text-sm leading-relaxed text-[#6B6B6B]">
              {persona.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
