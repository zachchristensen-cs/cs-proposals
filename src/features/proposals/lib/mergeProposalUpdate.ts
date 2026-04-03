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
 * Only apply sections that Claude actually changed.
 */
export function mergeProposalUpdate(
  currentContent: ProposalContent,
  sentContent: ProposalContent,
  claudeOutput: Record<string, unknown>,
): ProposalContent {
  const merged = { ...currentContent }

  const sectionKeys: (keyof ProposalContent)[] = [
    'cover',
    'opportunity',
    'personas',
    'phases',
    'total',
    'payment',
    'maintenance',
    'team',
    'notes',
    'timing_note',
    'contact',
  ]

  for (const key of sectionKeys) {
    if (!(key in claudeOutput)) continue

    const claudeValue = claudeOutput[key]
    const sentValue = sentContent[key]

    // Did Claude actually change this section compared to what was sent?
    const claudeJSON = JSON.stringify(claudeValue)
    const sentJSON = JSON.stringify(sentValue)

    if (claudeJSON !== sentJSON) {
      // Claude changed this section — apply it
      ;(merged as Record<string, unknown>)[key] = claudeValue
    }
    // Otherwise: Claude returned it unchanged — keep current (user may have edited)
  }

  return merged
}
