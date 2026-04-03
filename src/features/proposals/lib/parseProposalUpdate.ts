import type { ProposalContent } from '@/types/database'

interface ParseResult {
  displayText: string
  proposalUpdate: (ProposalContent & { client_name?: string; tier?: number }) | null
  parseError: boolean
}

export function parseProposalResponse(fullResponse: string): ParseResult {
  const updateMatch = fullResponse.match(
    /<proposal_update>([\s\S]*?)<\/proposal_update>/,
  )

  if (!updateMatch) {
    return { displayText: fullResponse.trim(), proposalUpdate: null, parseError: false }
  }

  // Extract display text (everything outside the tags)
  const displayText = fullResponse
    .replace(/<proposal_update>[\s\S]*?<\/proposal_update>/, '')
    .trim()

  // Parse the JSON
  try {
    let proposalUpdate = JSON.parse(updateMatch[1].trim())

    // Claude sometimes wraps the proposal fields inside an extra "content" key.
    // Detect and unwrap: if proposalUpdate.content exists (as an object with cover/phases)
    // but proposalUpdate.cover does not, flatten it.
    if (
      proposalUpdate.content &&
      typeof proposalUpdate.content === 'object' &&
      !Array.isArray(proposalUpdate.content) &&
      proposalUpdate.content.cover &&
      !proposalUpdate.cover
    ) {
      const { content: nested, ...topLevel } = proposalUpdate
      proposalUpdate = { ...nested, ...topLevel }
    }

    return { displayText, proposalUpdate, parseError: false }
  } catch {
    console.error('Failed to parse proposal update JSON')
    return {
      displayText: fullResponse.trim(),
      proposalUpdate: null,
      parseError: true,
    }
  }
}

/**
 * Strip <proposal_update> tags from text for display in chat bubbles.
 * Used during streaming so JSON doesn't flash in the UI.
 */
export function stripProposalTags(text: string): string {
  return text.replace(/<proposal_update>[\s\S]*$/, '').trim()
}
