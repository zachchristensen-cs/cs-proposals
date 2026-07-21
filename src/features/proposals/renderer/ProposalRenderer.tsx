import type { ProposalContent } from '@/types/database'
import { CoverSection } from './CoverSection'
import { OpportunitySection } from './OpportunitySection'
import { PersonasSection } from './PersonasSection'
import { PhasesSection } from './PhasesSection'
import { PackagesSection } from './PackagesSection'
import { TotalsSection } from './TotalsSection'
import { PaymentSection } from './PaymentSection'
import { MaintenanceSection } from './MaintenanceSection'
import { TeamSection } from './TeamSection'
import { NotesSection } from './NotesSection'
import { RemoveButton } from '../components/RemoveButton'
import { BRANDS, getBrand } from './brands'
import { computeAdjustedTotals } from '../lib/selection'
import { RETAINER_INTERVALS, retainerIntervalConfig } from '../lib/retainerInterval'

interface ProposalRendererProps {
  content: ProposalContent
  editable?: boolean
  onContentChange?: (content: ProposalContent) => void
  /** Public page: optional items get checkboxes and totals react to selection */
  selectable?: boolean
  deselected?: Set<string>
  onToggleItem?: (key: string) => void
  /** Pick-one packages: currently selected package id + selection handler */
  selectedPackageId?: string
  onSelectPackage?: (id: string) => void
}

export function ProposalRenderer({ content, editable, onContentChange, selectable, deselected, onToggleItem, selectedPackageId, onSelectPackage }: ProposalRendererProps) {
  const brand = getBrand(content.brand)
  const isRetainer = content.proposal_type === 'retainer'
  const intervalConfig = retainerIntervalConfig(content.retainer_interval)
  const adjusted = computeAdjustedTotals(content, deselected ?? new Set(), selectedPackageId)
  const displayTotal = isRetainer
    ? (content.retainer_amount ?? adjusted.total)
    : adjusted.total
  const hasOpportunity = (content.opportunity?.paragraphs?.length ?? 0) > 0
  const hasPersonas = (content.personas?.items?.length ?? 0) > 0
  const hasPhases = (content.phases?.length ?? 0) > 0
  const hasPayment = (content.payment?.terms?.length ?? 0) > 0
  const hasMaintenance = (content.maintenance?.tiers?.length ?? 0) > 0
  const hasTeam = (content.team?.members?.length ?? 0) > 0
  const hasNotes = (content.notes?.items?.length ?? 0) > 0 || content.timing_note

  // Build payment note string for the totals section
  const paymentNote = isRetainer
    ? intervalConfig.billedNote
    : hasPayment
      ? content.payment!.terms.map((t) => t.label).join(' & ').replace(/&([^&]*)$/, '& $1') || undefined
      : undefined

  // Numbered sections: packages (if any) = 1, then phases, then maintenance
  const hasPackages = (content.packages?.options?.length ?? 0) > 0
  const packagesScopeNum = 1
  const phaseScopeStart = hasPackages ? 2 : 1
  const maintenanceScopeNum = phaseScopeStart + (content.phases?.length ?? 0)

  function removeSection(key: 'opportunity' | 'personas' | 'packages' | 'maintenance' | 'team' | 'notes' | 'timing_note') {
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
    <div id="proposal-content" className={`${brand.themeClass} min-h-screen bg-[var(--p-bg)]`}>
      <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-16">
        {/* Brand + proposal type toggles (editor only) */}
        {editable && onContentChange && (
          <div className="mb-6 flex items-center justify-end gap-2 print:hidden">
            <div className="mr-4 flex items-center gap-2">
              <span className="text-sm text-[var(--p-muted)]">Type</span>
              <div className="flex overflow-hidden rounded-full border border-[var(--p-border)]">
                {(['project', 'retainer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() =>
                      onContentChange({
                        ...content,
                        proposal_type: t,
                        retainer_amount:
                          t === 'retainer'
                            ? (content.retainer_amount ?? content.total)
                            : content.retainer_amount,
                      })
                    }
                    className={`px-3 py-1 text-xs capitalize transition-colors ${
                      (content.proposal_type ?? 'project') === t
                        ? 'bg-[var(--p-ink)] text-[var(--p-bg)]'
                        : 'text-[var(--p-muted)] hover:text-[var(--p-ink)]'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {isRetainer && (
              <div className="mr-4 flex items-center gap-2">
                <span className="text-sm text-[var(--p-muted)]">Billing</span>
                <div className="flex overflow-hidden rounded-full border border-[var(--p-border)]">
                  {RETAINER_INTERVALS.map((iv) => (
                    <button
                      key={iv.id}
                      type="button"
                      onClick={() => onContentChange({ ...content, retainer_interval: iv.id })}
                      className={`px-2.5 py-1 text-xs transition-colors ${
                        intervalConfig.id === iv.id
                          ? 'bg-[var(--p-ink)] text-[var(--p-bg)]'
                          : 'text-[var(--p-muted)] hover:text-[var(--p-ink)]'
                      }`}
                    >
                      {iv.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <span className="text-sm text-[var(--p-muted)]">Proposal by</span>
            <div className="flex overflow-hidden rounded-full border border-[var(--p-border)]">
              {Object.values(BRANDS).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onContentChange({ ...content, brand: b.id })}
                  className={`px-3 py-1 text-xs transition-colors ${
                    brand.id === b.id
                      ? 'bg-[var(--p-ink)] text-[var(--p-bg)]'
                      : 'text-[var(--p-muted)] hover:text-[var(--p-ink)]'
                  }`}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <CoverSection
          cover={content.cover}
          brandName={brand.name}
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

        {hasPackages && (
          <div className="group/section relative">
            {editable && onContentChange && (
              <div className="absolute -right-6 top-0">
                <RemoveButton onRemove={() => removeSection('packages')} title="Remove Packages" className="opacity-0 group-hover/section:opacity-100" />
              </div>
            )}
            <PackagesSection
              packages={content.packages!}
              sectionNumber={packagesScopeNum}
              selectable={selectable}
              selectedId={selectedPackageId}
              onSelect={onSelectPackage}
              editable={editable}
              onPackagesChange={
                onContentChange
                  ? (packages) => onContentChange({ ...content, packages })
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
              selectable={selectable}
              deselected={deselected}
              onToggleItem={onToggleItem}
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

        {(content.total ?? 0) > 0 && !content.hide_total && (
          <TotalsSection
            total={displayTotal}
            isRetainer={isRetainer}
            retainerSuffix={intervalConfig.suffix}
            subtotal={adjusted.subtotal}
            discounts={content.discounts}
            discountTotal={adjusted.discountTotal}
            paymentNote={paymentNote}
            maintenanceNote={hasMaintenance ? '+ Maintenance after launch' : undefined}
            editable={editable}
            onDiscountsChange={
              onContentChange
                ? (discounts) => onContentChange({ ...content, discounts })
                : undefined
            }
          />
        )}

        {/* Toggle to hide/show total + payment sections */}
        {editable && onContentChange && (content.total ?? 0) > 0 && (
          <div className="mb-8 flex items-center justify-end gap-2 print:hidden">
            <span className="text-sm text-[var(--p-muted)]">
              {content.hide_total ? 'Total & payment hidden from client' : 'Hide total & payment'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!content.hide_total}
              onClick={() => onContentChange({ ...content, hide_total: !content.hide_total })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                content.hide_total ? 'bg-[var(--p-ink)]' : 'bg-[var(--p-border)]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                  content.hide_total ? 'translate-x-[18px]' : 'translate-x-[3px]'
                }`}
              />
            </button>
          </div>
        )}

        {hasPayment && !content.hide_total && !isRetainer && (
          <PaymentSection
            payment={content.payment}
            editable={editable}
            computedAmounts={selectable ? adjusted.termAmounts : undefined}
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
        <div className="proposal-footer flex items-end justify-between border-t border-[var(--p-border)] pt-8">
          <div>
            <p className="text-sm font-medium text-[var(--p-ink)]">{content.contact?.name || ''}</p>
            <p className="text-sm text-[var(--p-muted)]">{content.contact?.email || ''}</p>
          </div>
          <img
            src={brand.logo}
            alt={brand.name}
            className={`w-auto ${brand.footerLogoClass}`}
          />
        </div>
      </div>

    </div>
  )
}
