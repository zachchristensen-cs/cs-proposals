import type { ProposalContent } from '@/types/database'
import { EditableText } from '../components/EditableText'
import { RemoveButton } from '../components/RemoveButton'
import { AddButton } from '../components/AddButton'

interface PersonasSectionProps {
  personas: NonNullable<ProposalContent['personas']>
  editable?: boolean
  onPersonasChange?: (personas: NonNullable<ProposalContent['personas']>) => void
}

export function PersonasSection({ personas, editable, onPersonasChange }: PersonasSectionProps) {
  function updatePersona(index: number, field: 'title' | 'description', value: string) {
    const items = personas.items.map((p, i) =>
      i === index ? { ...p, [field]: value } : p,
    )
    onPersonasChange?.({ ...personas, items })
  }

  function removePersona(index: number) {
    const items = personas.items.filter((_, i) => i !== index)
    onPersonasChange?.({ ...personas, items })
  }

  function addPersona() {
    const items = [...personas.items, { icon: '', title: '', description: '' }]
    onPersonasChange?.({ ...personas, items })
  }

  return (
    <section className="mb-12">
      <h2 className="mb-4 font-serif text-2xl text-[#1A1A1A]">
        Who We're Designing For
      </h2>

      {personas.intro && (
        <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A]">
          {editable ? (
            <EditableText
              value={personas.intro}
              onChange={(v) => onPersonasChange?.({ ...personas, intro: v })}
              multiline
            />
          ) : (
            personas.intro
          )}
        </p>
      )}

      <div className="group/list">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {personas.items.map((persona, i) => (
            <div key={i} className="group/item relative">
              <h3 className="mb-1 text-sm font-medium text-[#1A1A1A]">
                {editable ? (
                  <EditableText
                    value={persona.title}
                    onChange={(v) => updatePersona(i, 'title', v)}
                  />
                ) : (
                  persona.title
                )}
              </h3>
              <p className="text-sm leading-relaxed text-[#6B6B6B]">
                {editable ? (
                  <EditableText
                    value={persona.description}
                    onChange={(v) => updatePersona(i, 'description', v)}
                    multiline
                  />
                ) : (
                  persona.description
                )}
              </p>
              {editable && onPersonasChange && (
                <div className="absolute -right-1 -top-1">
                  <RemoveButton onRemove={() => removePersona(i)} title="Remove persona" />
                </div>
              )}
            </div>
          ))}
        </div>
        {editable && onPersonasChange && (
          <AddButton onAdd={addPersona} label="Add persona" />
        )}
      </div>
    </section>
  )
}
