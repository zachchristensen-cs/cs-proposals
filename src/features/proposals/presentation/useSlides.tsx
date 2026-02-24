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

    // 4. Phases — one slide per phase
    let scopeNum = 1
    if (content.phases?.length) {
      content.phases.forEach((phase, i) => {
        slides.push({
          id: `phase-${i}`,
          label: phase.name,
          render: () => (
            <PhasesSection
              phases={[phase]}
              sectionNumber={scopeNum + i}
              hideNumber
            />
          ),
        })
      })
      scopeNum += content.phases.length
    }

    // 5. Maintenance — optional
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
          />
        ),
      })
    }

    // 6. Totals
    const hasPayment = (content.payment?.terms?.length ?? 0) > 0
    if ((content.total ?? 0) > 0) {
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

    // 7. Payment — optional
    if (hasPayment) {
      slides.push({
        id: 'payment',
        label: 'Payment Terms',
        render: () => <PaymentSection payment={content.payment} />,
      })
    }

    // 8. Team — optional
    if (content.team?.members?.length) {
      slides.push({
        id: 'team',
        label: 'Your Team',
        render: () => <TeamSection team={content.team!} />,
      })
    }

    // 9. Notes — optional
    if (content.notes?.items?.length || content.timing_note) {
      slides.push({
        id: 'notes',
        label: 'Notes',
        render: () => (
          <NotesSection notes={content.notes} timingNote={content.timing_note} />
        ),
      })
    }

    // 10. Thank You / Footer
    slides.push({
      id: 'footer',
      label: 'Thank You',
      render: () => <FooterSlide contact={content.contact} />,
    })

    return slides
  }, [content])
}
