import type { ProposalContent } from '@/types/database'
import { EditableText } from '../components/EditableText'
import { RemoveButton } from '../components/RemoveButton'
import { AddButton } from '../components/AddButton'

import shaanPhoto from '@/assets/Shaan.avif'
import zachPhoto from '@/assets/Zach.avif'
import cemPhoto from '@/assets/Cem.avif'
import dannyPhoto from '@/assets/Danny.avif'
import ankiPhoto from '@/assets/Anki.avif'
import kayleighPhoto from '@/assets/Kayleigh.avif'

const TEAM_PHOTOS: Record<string, string> = {
  'Shaan Singh': shaanPhoto,
  'Zach Christensen': zachPhoto,
  'Cem Ilhan': cemPhoto,
  'Danny Somoza': dannyPhoto,
  'Ankita Suri': ankiPhoto,
  'Kayleigh Flaherty': kayleighPhoto,
}

interface TeamSectionProps {
  team: NonNullable<ProposalContent['team']>
  editable?: boolean
  onTeamChange?: (team: NonNullable<ProposalContent['team']>) => void
}

export function TeamSection({ team, editable, onTeamChange }: TeamSectionProps) {
  // Pick columns so rows are balanced (no orphan hanging alone)
  const count = team.members.length
  const cols = count <= 2 ? count : count % 3 === 0 || count >= 6 ? 3 : 2

  function updateMemberBio(index: number, bio: string) {
    const members = team.members.map((m, i) =>
      i === index ? { ...m, bio } : m,
    )
    onTeamChange?.({ ...team, members })
  }

  function removeMember(index: number) {
    const members = team.members.filter((_, i) => i !== index)
    onTeamChange?.({ ...team, members })
  }

  function addMember() {
    const members = [...team.members, { name: '', role: '', bio: '', initials: '' }]
    onTeamChange?.({ ...team, members })
  }

  return (
    <section className="mb-12">
      <h2 className="mb-2 font-serif text-2xl text-[var(--p-ink)]">
        Your Team
      </h2>

      <p className="mb-6 text-sm leading-relaxed text-[var(--p-body)]">
        {editable ? (
          <EditableText
            value={team.intro}
            onChange={(v) => onTeamChange?.({ ...team, intro: v })}
            multiline
          />
        ) : (
          team.intro
        )}
      </p>

      <div className="group/list">
        <div className={
          cols === 1 ? 'grid gap-6' :
          cols === 2 ? 'grid gap-6 sm:grid-cols-2' :
          'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
        }>
          {team.members.map((member, i) => {
            const photoUrl = member.photo_url || TEAM_PHOTOS[member.name]

            return (
              <div key={i} className="group/item relative flex gap-3">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={member.name}
                    className="size-10 shrink-0 rounded-full object-cover"
                    style={{
                      filter: 'grayscale(100%) contrast(0.85) brightness(1.05)',
                    }}
                  />
                ) : (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--p-border)] text-xs font-medium text-[var(--p-ink)]">
                    {member.initials}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-[var(--p-ink)]">
                    {member.name}
                  </h3>
                  <p className="text-xs text-[var(--p-muted)]">{member.role}</p>
                  {member.bio && (
                    <p className="mt-1 text-sm leading-relaxed text-[var(--p-muted)]">
                      {editable ? (
                        <EditableText
                          value={member.bio}
                          onChange={(v) => updateMemberBio(i, v)}
                          multiline
                        />
                      ) : (
                        member.bio
                      )}
                    </p>
                  )}
                </div>
                {editable && onTeamChange && (
                  <div className="absolute -right-1 -top-1">
                    <RemoveButton onRemove={() => removeMember(i)} title="Remove member" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
        {editable && onTeamChange && (
          <AddButton onAdd={addMember} label="Add member" />
        )}
      </div>
    </section>
  )
}
