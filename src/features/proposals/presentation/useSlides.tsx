import { useMemo, type ReactNode } from 'react'
import type { ProposalContent } from '@/types/database'
import { CoverSection } from '../renderer/CoverSection'
import { OpportunitySection } from '../renderer/OpportunitySection'
import { PersonasSection } from '../renderer/PersonasSection'
import { PhasesSection } from '../renderer/PhasesSection'
import { MaintenanceSection } from '../renderer/MaintenanceSection'
import { TotalsSection } from '../renderer/TotalsSection'
import { PaymentSection } from '../renderer/PaymentSection'
import { TeamSection } from '../renderer/TeamSection'
import { NotesSection } from '../renderer/NotesSection'
import cambridgeLogo from '@/assets/CambridgeStudio Logo.svg'

export interface Slide {
  id: string
  label: string
  render: () => ReactNode
}

function SectionDivider({ title }: { title: string }) {
  return (
    <section className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="font-serif text-3xl text-[#1A1A1A]">{title}</h2>
    </section>
  )
}

function FooterSlide({ contact }: { contact?: ProposalContent['contact'] }) {
  return (
    <section className="flex flex-col items-center text-center py-8">
      <img
        src={cambridgeLogo}
        alt="Cambridge Studio"
        className="mb-10 h-12 w-auto opacity-40"
      />
      <h2 className="mb-3 font-serif text-3xl text-[#1A1A1A]">Thank You</h2>
      <p className="text-sm text-[#6B6B6B]">
        We're excited about the opportunity to work together.
      </p>
      {contact && (
        <div className="mt-8 text-sm">
          <p className="font-medium text-[#1A1A1A]">{contact.name}</p>
          <p className="text-[#6B6B6B]">{contact.email}</p>
        </div>
      )}
    </section>
  )
}

export function useSlides(content: ProposalContent): Slide[] {
  return useMemo(() => {
    const slides: Slide[] = []

    // ─── Act 1: Introduction & Context ───────────────────────

    // 1. Cover — always present
    slides.push({
      id: 'cover',
      label: 'Cover',
      render: () => <CoverSection cover={content.cover} />,
    })

    // 2. Opportunity — optional
    if (content.opportunity?.paragraphs?.length) {
      slides.push({
        id: 'opportunity',
        label: 'The Opportunity',
        render: () => <OpportunitySection opportunity={content.opportunity!} />,
      })
    }

    // 3. Personas — optional
    if (content.personas?.items?.length) {
      slides.push({
        id: 'personas',
        label: 'Personas',
        render: () => <PersonasSection personas={content.personas!} />,
      })
    }

    // ─── Act 2: Deliverables ─────────────────────────────────

    // 4. "Scope of Work" divider — before phases
    let scopeNum = 1
    const hasPhases = (content.phases?.length ?? 0) > 0
    if (hasPhases) {
      slides.push({
        id: 'scope-divider',
        label: 'Scope of Work',
        render: () => <SectionDivider title="Scope of Work" />,
      })

      // 5. Phases — one slide per phase (pricing hidden until Investment)
      content.phases.forEach((phase, i) => {
        slides.push({
          id: `phase-${i}`,
          label: phase.name,
          render: () => (
            <PhasesSection
              phases={[phase]}
              sectionNumber={scopeNum + i}
              hideNumber
              hidePricing
            />
          ),
        })
      })
      scopeNum += content.phases.length
    }

    // 6. Maintenance — optional
    const hasMaintenance = (content.maintenance?.tiers?.length ?? 0) > 0
    if (hasMaintenance) {
      slides.push({
        id: 'maintenance',
        label: 'Maintenance',
        render: () => (
          <MaintenanceSection
            maintenance={content.maintenance!}
            sectionNumber={scopeNum++}
            hideNumber
            hidePricing
          />
        ),
      })
    }

    // ─── Act 3: Investment ───────────────────────────────────

    // 7. "Investment" divider — before totals
    const hasPayment = (content.payment?.terms?.length ?? 0) > 0
    const hasTotal = (content.total ?? 0) > 0
    if (hasTotal) {
      slides.push({
        id: 'investment-divider',
        label: 'Investment',
        render: () => <SectionDivider title="Investment" />,
      })

      // 8. Totals
      const paymentNote = hasPayment
        ? content.payment!.terms
            .map((t) => t.label)
            .join(' & ')
            .replace(/&([^&]*)$/, '& $1') || undefined
        : undefined

      slides.push({
        id: 'totals',
        label: 'Total Estimate',
        render: () => (
          <TotalsSection
            total={content.total}
            paymentNote={paymentNote}
            maintenanceNote={hasMaintenance ? '+ Maintenance after launch' : undefined}
          />
        ),
      })
    }

    // 9. Payment — optional, now with heading
    if (hasPayment) {
      slides.push({
        id: 'payment',
        label: 'Payment Terms',
        render: () => (
          <>
            <h2 className="mb-6 font-serif text-2xl text-[#1A1A1A]">
              Payment Terms
            </h2>
            <PaymentSection payment={content.payment} />
          </>
        ),
      })
    }

    // ─── Act 4: Close ────────────────────────────────────────

    // 10. Team — optional
    if (content.team?.members?.length) {
      slides.push({
        id: 'team',
        label: 'Your Team',
        render: () => <TeamSection team={content.team!} />,
      })
    }

    // 11. Notes — optional
    if (content.notes?.items?.length || content.timing_note) {
      slides.push({
        id: 'notes',
        label: 'Notes',
        render: () => (
          <NotesSection notes={content.notes} timingNote={content.timing_note} />
        ),
      })
    }

    // 12. Thank You / Footer
    slides.push({
      id: 'footer',
      label: 'Thank You',
      render: () => <FooterSlide contact={content.contact} />,
    })

    return slides
  }, [content])
}
