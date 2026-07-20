import { Check } from 'lucide-react'
import type { ProposalContent, ProposalPackage } from '@/types/database'
import { formatCurrency } from '../lib/formatCurrency'
import { EditableText } from '../components/EditableText'
import { EditablePrice } from '../components/EditablePrice'
import { RemoveButton } from '../components/RemoveButton'
import { AddButton } from '../components/AddButton'

interface PackagesSectionProps {
  packages: NonNullable<ProposalContent['packages']>
  sectionNumber: number
  hideNumber?: boolean
  /** Client public page: render selectable radio cards */
  selectable?: boolean
  /** id of the currently selected package */
  selectedId?: string
  onSelect?: (id: string) => void
  editable?: boolean
  onPackagesChange?: (packages: NonNullable<ProposalContent['packages']>) => void
}

let uid = 0
function newPackageId(): string {
  uid += 1
  return `pkg_${Date.now().toString(36)}_${uid}`
}

export function PackagesSection({
  packages,
  sectionNumber,
  hideNumber,
  selectable,
  selectedId,
  onSelect,
  editable,
  onPackagesChange,
}: PackagesSectionProps) {
  const options = packages.options ?? []

  // Which card reads as "selected": the client's choice, else default, else recommended, else first
  const activeId =
    options.find((p) => p.id === selectedId)?.id ??
    options.find((p) => p.id === packages.default_id)?.id ??
    options.find((p) => p.recommended)?.id ??
    options[0]?.id

  function updatePackage(index: number, patch: Partial<ProposalPackage>) {
    const next = options.map((p, i) => (i === index ? { ...p, ...patch } : p))
    onPackagesChange?.({ ...packages, options: next })
  }

  function updateFeature(pi: number, fi: number, value: string) {
    const features = [...(options[pi].features ?? [])]
    features[fi] = value
    updatePackage(pi, { features })
  }

  function addFeature(pi: number) {
    const features = [...(options[pi].features ?? []), 'New inclusion']
    updatePackage(pi, { features })
  }

  function removeFeature(pi: number, fi: number) {
    const features = (options[pi].features ?? []).filter((_, i) => i !== fi)
    updatePackage(pi, { features })
  }

  function removePackage(index: number) {
    const next = options.filter((_, i) => i !== index)
    onPackagesChange?.({ ...packages, options: next })
  }

  function addPackage() {
    const next = [...options, { id: newPackageId(), name: 'New package', price: 0, features: [] }]
    onPackagesChange?.({ ...packages, options: next })
  }

  function setRecommended(index: number) {
    const next = options.map((p, i) => ({ ...p, recommended: i === index }))
    onPackagesChange?.({ ...packages, options: next })
  }

  return (
    <section className="mb-12">
      <div className="mb-2 flex items-start gap-4">
        {!hideNumber && (
          <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-[var(--p-border)] text-xs text-[var(--p-muted)]">
            {sectionNumber}
          </span>
        )}
        <h2 className="font-serif text-2xl text-[var(--p-ink)]">Choose your package</h2>
      </div>

      {(packages.intro || editable) && (
        <p className={`mb-6 text-sm leading-relaxed text-[var(--p-muted)] ${hideNumber ? '' : 'pl-11'}`}>
          {editable ? (
            <EditableText
              value={packages.intro ?? ''}
              onChange={(v) => onPackagesChange?.({ ...packages, intro: v })}
              placeholder="Optional intro line (e.g. 'Pick the level that fits — you can change later')"
              multiline
            />
          ) : (
            packages.intro
          )}
        </p>
      )}

      <div className={`group/list grid gap-4 sm:grid-cols-3 ${hideNumber ? '' : 'pl-11'}`}>
        {options.map((pkg, i) => {
          const isActive = pkg.id === activeId
          const clickable = selectable && !!onSelect
          return (
            <div
              key={pkg.id || i}
              role={clickable ? 'radio' : undefined}
              aria-checked={clickable ? isActive : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onSelect!(pkg.id) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect!(pkg.id)
                      }
                    }
                  : undefined
              }
              className={`group/item relative flex flex-col rounded-lg border p-5 transition-colors ${
                isActive
                  ? 'border-[var(--p-ink)] ring-1 ring-[var(--p-ink)]'
                  : 'border-[var(--p-border)]'
              } ${clickable ? 'cursor-pointer hover:border-[var(--p-ink)]' : ''}`}
            >
              {pkg.recommended && (
                <span className="absolute -top-2 left-4 rounded-full bg-[var(--p-ink)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--p-bg)]">
                  Recommended
                </span>
              )}

              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif text-lg text-[var(--p-ink)]">
                  {editable ? (
                    <EditableText value={pkg.name} onChange={(v) => updatePackage(i, { name: v })} placeholder="Package name" />
                  ) : (
                    pkg.name
                  )}
                </h3>
                {selectable && (
                  <span
                    className={`mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                      isActive ? 'border-[var(--p-ink)] bg-[var(--p-ink)]' : 'border-[var(--p-border)]'
                    }`}
                    aria-hidden
                  >
                    {isActive && <span className="size-1.5 rounded-full bg-[var(--p-bg)]" />}
                  </span>
                )}
              </div>

              <div className="mt-1 font-serif text-2xl text-[var(--p-accent)]">
                {editable ? (
                  <EditablePrice value={pkg.price} onChange={(v) => updatePackage(i, { price: v })} />
                ) : (
                  formatCurrency(pkg.price)
                )}
              </div>

              {(pkg.summary || editable) && (
                <p className="mt-2 text-sm text-[var(--p-muted)]">
                  {editable ? (
                    <EditableText value={pkg.summary ?? ''} onChange={(v) => updatePackage(i, { summary: v })} placeholder="One-line summary" multiline />
                  ) : (
                    pkg.summary
                  )}
                </p>
              )}

              {((pkg.features?.length ?? 0) > 0 || editable) && (
                <ul className="mt-4 space-y-2">
                  {(pkg.features ?? []).map((feat, fi) => (
                    <li key={fi} className="group/feat flex items-start gap-2 text-sm text-[var(--p-body)]">
                      <Check className="mt-0.5 size-4 shrink-0 text-[var(--p-accent)]" />
                      <span className="flex-1">
                        {editable ? (
                          <EditableText value={feat} onChange={(v) => updateFeature(i, fi, v)} placeholder="Inclusion" />
                        ) : (
                          feat
                        )}
                      </span>
                      {editable && onPackagesChange && (
                        <RemoveButton onRemove={() => removeFeature(i, fi)} title="Remove inclusion" />
                      )}
                    </li>
                  ))}
                  {editable && onPackagesChange && <AddButton onAdd={() => addFeature(i)} label="Add inclusion" />}
                </ul>
              )}

              {editable && onPackagesChange && (
                <div className="mt-4 flex items-center justify-between border-t border-[var(--p-border)] pt-3">
                  <button
                    type="button"
                    onClick={() => setRecommended(i)}
                    className={`text-xs ${pkg.recommended ? 'text-[var(--p-ink)]' : 'text-[var(--p-muted)] hover:text-[var(--p-ink)]'}`}
                  >
                    {pkg.recommended ? '★ Recommended' : 'Mark recommended'}
                  </button>
                  <RemoveButton onRemove={() => removePackage(i)} title="Remove package" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {editable && onPackagesChange && (
        <div className={hideNumber ? '' : 'pl-11'}>
          <AddButton onAdd={addPackage} label="Add package" />
        </div>
      )}
    </section>
  )
}
