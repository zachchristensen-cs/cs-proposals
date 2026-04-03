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
import { RemoveButton } from '../components/RemoveButton'
import cambridgeLogo from '@/assets/CambridgeStudio Logo.svg'

interface ProposalRendererProps {
  content: ProposalContent
  editable?: boolean
  onContentChange?: (content: ProposalContent) => void
}

export function ProposalRenderer({ content, editable, onContentChange }: ProposalRendererProps) {
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

  // Numbered sections: phases start at 1, maintenance follows after
  const phaseScopeStart = 1
  const maintenanceScopeNum = phaseScopeStart + (content.phases?.length ?? 0)

  function removeSection(key: 'opportunity' | 'personas' | 'maintenance' | 'team' | 'notes' | 'timing_note') {
    if (!onContentChange) return
    const updated = { ...content }
    if (key === 'timing_note') {
      delete updated.timing_note
    } else {
      delete updated[key]
    }
    onContentChange(updated)
  }

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
          <div className="group/section relative">
            {editable && onContentChange && (
              <div className="absolute -right-6 top-0">
                <RemoveButton onRemove={() => removeSection('opportunity')} title="Remove Opportunity" className="opacity-0 group-hover/section:opacity-100" />
              </div>
            )}
            <OpportunitySection
              opportunity={content.opportunity!}
              editable={editable}
              onOpportunityChange={
                onContentChange
                  ? (opportunity) => onContentChange({ ...content, opportunity })
                  : undefined
              }
            />
          </div>
        )}

        {hasPersonas && (
          <div className="group/section relative">
            {editable && onContentChange && (
              <div className="absolute -right-6 top-0">
                <RemoveButton onRemove={() => removeSection('personas')} title="Remove Personas" className="opacity-0 group-hover/section:opacity-100" />
              </div>
            )}
            <PersonasSection
              personas={content.personas!}
              editable={editable}
              onPersonasChange={
                onContentChange
                  ? (personas) => onContentChange({ ...content, personas })
                  : undefined
              }
            />
          </div>
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
          </>
        )}

        {hasMaintenance && (
          <div className="group/section relative">
            {editable && onContentChange && (
              <div className="absolute -right-6 top-0">
                <RemoveButton onRemove={() => removeSection('maintenance')} title="Remove Maintenance" className="opacity-0 group-hover/section:opacity-100" />
              </div>
            )}
            <MaintenanceSection
              maintenance={content.maintenance!}
              sectionNumber={maintenanceScopeNum}
              editable={editable}
              onMaintenanceChange={
                onContentChange
                  ? (maintenance) => onContentChange({ ...content, maintenance })
                  : undefined
              }
            />
          </div>
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
          <div className="group/section relative">
            {editable && onContentChange && (
              <div className="absolute -right-6 top-0">
                <RemoveButton onRemove={() => removeSection('team')} title="Remove Team" className="opacity-0 group-hover/section:opacity-100" />
              </div>
            )}
            <TeamSection
              team={content.team!}
              editable={editable}
              onTeamChange={
                onContentChange
                  ? (team) => onContentChange({ ...content, team })
                  : undefined
              }
            />
          </div>
        )}

        {hasNotes && (
          <div className="group/section relative">
            {editable && onContentChange && (
              <div className="absolute -right-6 top-0">
                <RemoveButton onRemove={() => removeSection('notes')} title="Remove Notes" className="opacity-0 group-hover/section:opacity-100" />
              </div>
            )}
            <NotesSection
              notes={content.notes}
              timingNote={content.timing_note}
              editable={editable}
              onNotesChange={
                onContentChange
                  ? (notes) => onContentChange({ ...content, notes })
                  : undefined
              }
              onTimingNoteChange={
                onContentChange
                  ? (timingNote) => onContentChange({ ...content, timing_note: timingNote })
                  : undefined
              }
            />
          </div>
        )}

        {/* Footer */}
        <div className="proposal-footer flex items-end justify-between border-t border-[#D4D0C8] pt-8">
          <div>
            <p className="text-sm font-medium text-[#1A1A1A]">{content.contact?.name || ''}</p>
            <p className="text-sm text-[#6B6B6B]">{content.contact?.email || ''}</p>
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
