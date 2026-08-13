import type { ProposalContent } from '@/types/database'

/**
 * Selectively merge Claude's proposal update into the current content.
 *
 * Problem: Claude returns the COMPLETE proposal JSON (all sections), but it
 * may subtly alter sections it wasn't asked to change — rewriting text,
 * rounding prices, reordering items. A naive spread overwrites the user's
 * manual edits.
 *
 * Solution: Compare each top-level key in Claude's output against the
 * snapshot that was sent to Claude (`sentContent`). If a section is
 * identical to what was sent, skip it — keep the user's current version
 * (which may include further manual edits made while Claude was streaming).
 * Only apply sections that Claude actually changed. A section Claude
 * explicitly sets to null is removed (how optional sections get deleted);
 * a section Claude omits entirely is left untouched.
 *
 * NOTE: every top-level ProposalContent key must be listed here. A key
 * missing from this list means Claude's updates to it are silently dropped —
 * this is exactly what broke packages/proposal_type/discounts updates when
 * those fields were added without updating this list.
 */
const SECTION_KEYS: (keyof ProposalContent)[] = [
  'brand',
  'proposal_type',
  'retainer_amount',
  'discounts',
  'cover',
  'opportunity',
  'personas',
  'phases',
  'packages',
  'total',
  'hide_total',
  'payment',
  'maintenance',
  'team',
  'notes',
  'timing_note',
  'contact',
]

export function mergeProposalUpdate(
  currentContent: ProposalContent,
  sentContent: ProposalContent,
  claudeOutput: Record<string, unknown>,
): ProposalContent {
  const merged = { ...currentContent }

  for (const key of SECTION_KEYS) {
    if (!(key in claudeOutput)) continue

    const claudeValue = claudeOutput[key]
    const sentValue = sentContent[key]

    // Did Claude actually change this section compared to what was sent?
    const claudeJSON = JSON.stringify(claudeValue)
    const sentJSON = JSON.stringify(sentValue)

    if (claudeJSON !== sentJSON) {
      if (claudeValue === null || claudeValue === undefined) {
        // Explicit null = remove the section (e.g. "get rid of maintenance")
        delete (merged as Record<string, unknown>)[key]
      } else {
        // Claude changed this section — apply it
        ;(merged as Record<string, unknown>)[key] = claudeValue
      }
    }
    // Otherwise: Claude returned it unchanged — keep current (user may have edited)
  }

  return merged
}
