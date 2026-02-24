import type { ProposalContent } from '@/types/database'
import { CoverSection } from './CoverSection'
import { OpportunitySection } from './OpportunitySection'
import { PersonasSection } from './PersonasSection'
import { PhasesSection } from './PhasesSection'
import { TotalsSection } from './TotalsSection'
import { PaymentSection } from './PaymentSection'
import { MaintenanceSection } from './MaintenanceSection'
import { TeamSection } from './TeamSection'
import { NotesSection } from './NotesSection'
import cambridgeLogo from '@/assets/CambridgeStudio Logo.svg'

interface ProposalRendererProps {
  content: ProposalContent
  editable?: boolean
  onContentChange?: (content: ProposalContent) => void
}

export function ProposalRenderer({ content, editable, onContentChange }: ProposalRendererProps) {
  // Only phases and maintenance get numbered circles
  let scopeNum = 0

  const hasOpportunity = (content.opportunity?.paragraphs?.length ?? 0) > 0
  const hasPersonas = (content.personas?.items?.length ?? 0) > 0
  const hasPhases = (content.phases?.length ?? 0) > 0
  const hasPayment = (content.payment?.terms?.length ?? 0) > 0
  const hasMaintenance = (content.maintenance?.tiers?.length ?? 0) > 0
  const hasTeam = (content.team?.members?.length ?? 0) > 0
  const hasNotes = (content.notes?.items?.length ?? 0) > 0 || content.timing_note

  // Build payment note string for the totals section
  const paymentNote = hasPayment
    ? content.payment!.terms.map((t) => t.label).join(' & ').replace(/&([^&]*)$/, '& $1') || undefined
    : undefined

  // Calculate starting scope number — phases come first in numbering
  const phaseScopeStart = scopeNum + 1

  return (
    <div id="proposal-content" className="min-h-screen bg-[#f5f2ed]">
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-16">
        <CoverSection
          cover={content.cover}
          editable={editable}
          onCoverChange={
            onContentChange
              ? (cover) => onContentChange({ ...content, cover })
              : undefined
          }
        />

        {hasOpportunity && (
          <OpportunitySection
            opportunity={content.opportunity!}
            editable={editable}
            onOpportunityChange={
              onContentChange
                ? (opportunity) => onContentChange({ ...content, opportunity })
                : undefined
            }
          />
        )}

        {hasPersonas && (
          <PersonasSection personas={content.personas!} />
        )}

        {hasPhases && (
          <>
            <PhasesSection
              phases={content.phases}
              sectionNumber={phaseScopeStart}
              editable={editable}
              onPhasesChange={
                onContentChange
                  ? (phases) => onContentChange({ ...content, phases })
                  : undefined
              }
            />
            {(() => { scopeNum = phaseScopeStart + content.phases.length - 1; return null })()}
          </>
        )}

        {hasMaintenance && (
          <MaintenanceSection
            maintenance={content.maintenance!}
            sectionNumber={++scopeNum}
          />
        )}

        {(content.total ?? 0) > 0 && (
          <TotalsSection
            total={content.total}
            paymentNote={paymentNote}
            maintenanceNote={hasMaintenance ? '+ Maintenance after launch' : undefined}
          />
        )}

        {hasPayment && (
          <PaymentSection
            payment={content.payment}
            editable={editable}
            onPaymentChange={
              onContentChange
                ? (payment) => onContentChange({ ...content, payment })
                : undefined
            }
          />
        )}

        {hasTeam && (
          <TeamSection team={content.team!} />
        )}

        {hasNotes && (
          <NotesSection
            notes={content.notes}
            timingNote={content.timing_note}
          />
        )}

        {/* Footer */}
        <div className="flex items-end justify-between border-t border-[#D4D0C8] pt-8">
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">{content.contact?.name || 'Danny Somoza'}</p>
            <p className="text-sm text-[#6B6B6B]">{content.contact?.email || 'danny@cambridgestudio.com'}</p>
          </div>
          <img
            src={cambridgeLogo}
            alt="Cambridge Studio"
            className="h-10 w-auto opacity-40"
          />
        </div>
      </div>

    </div>
  )
}
