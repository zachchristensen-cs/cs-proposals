import type { ProposalContent } from '@/types/database'

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
}

export function TeamSection({ team }: TeamSectionProps) {
  // Pick columns so rows are balanced (no orphan hanging alone)
  const count = team.members.length
  const cols = count <= 2 ? count : count % 3 === 0 || count >= 6 ? 3 : 2

  return (
    <section className="mb-12">
      <h2 className="mb-2 font-serif text-2xl text-[#1A1A1A]">
        Your Team
      </h2>

      <p className="mb-6 text-sm leading-relaxed text-[#4A4A4A]">
        {team.intro}
      </p>

      <div className={
        cols === 1 ? 'grid gap-6' :
        cols === 2 ? 'grid gap-6 sm:grid-cols-2' :
        'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
      }>
        {team.members.map((member, i) => {
          const photoUrl = member.photo_url || TEAM_PHOTOS[member.name]

          return (
            <div key={i} className="flex gap-3">
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
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#D4D0C8] text-xs font-medium text-[#1A1A1A]">
                  {member.initials}
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-[#1A1A1A]">
                  {member.name}
                </h3>
                <p className="text-xs text-[#6B6B6B]">{member.role}</p>
                {member.bio && (
                  <p className="mt-1 text-sm leading-relaxed text-[#6B6B6B]">
                    {member.bio}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
