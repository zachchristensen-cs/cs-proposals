import type { ProposalContent } from '@/types/database'

/**
 * Display-time brand enforcement. Proposal content (team bios, intros,
 * narratives) sometimes mentions the other brand; brand separation is a
 * hard rule, so client-facing renders swap any cross-brand mention for
 * the proposal's brand. Editor mode never uses this (it would silently
 * rewrite stored content while editing).
 */
export function transformContentForBrand(content: ProposalContent): ProposalContent {
  const brandName = content.brand === 'ammo' ? 'Ammo Studio' : 'Cambridge Studio'
  const crossBrand = content.brand === 'ammo' ? /Cambridge\s+Studio/gi : /Ammo\s+Studio/gi

  function walk(value: unknown): unknown {
    if (typeof value === 'string') return value.replace(crossBrand, brandName)
    if (Array.isArray(value)) return value.map(walk)
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(value)) out[k] = walk(v)
      return out
    }
    return value
  }

  const transformed = walk(content) as ProposalContent
  // never rewrite the brand field itself
  transformed.brand = content.brand
  return transformed
}
