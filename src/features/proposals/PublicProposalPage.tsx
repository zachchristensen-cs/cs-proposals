import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ProposalContent } from '@/types/database'
import { ProposalRenderer } from './renderer/ProposalRenderer'
import { SignatureSection } from './renderer/SignatureSection'
import { useViewTracking } from './hooks/useViewTracking'
import { computeAdjustedTotals, hasSelectableItems } from './lib/selection'

export function PublicProposalPage() {
  const { slug } = useParams<{ slug: string }>()
  const [content, setContent] = useState<ProposalContent | null>(null)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [deselected, setDeselected] = useState<Set<string>>(new Set())
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useViewTracking(slug, !loading && !notFound && !!content)

  const adjustedTotal = useMemo(() => {
    if (!content) return 0
    if (content.proposal_type === 'retainer') return content.retainer_amount ?? content.total
    return computeAdjustedTotals(content, deselected).total
  }, [content, deselected])

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }

    async function load() {
      const { data, error } = await supabase
        .from('proposals')
        .select('content, client_name, signed_at')
        .eq('slug', slug!)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setContent(data.content as ProposalContent)
        setSignedAt((data as { signed_at?: string | null }).signed_at ?? null)
      }
      setLoading(false)
    }

    load()
  }, [slug])

  if (loading) {
    return (
      <div className="proposal-theme flex min-h-screen items-center justify-center bg-[var(--p-bg)]">
        <p className="text-sm text-[var(--p-muted)]">Loading proposal...</p>
      </div>
    )
  }

  if (notFound || !content) {
    return (
      <div className="proposal-theme flex min-h-screen items-center justify-center bg-[var(--p-bg)]">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-[var(--p-ink)]">
            This proposal doesn't exist or has been removed.
          </h1>
          <p className="mt-2 text-sm text-[var(--p-muted)]">Cambridge Studio</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <ProposalRenderer
        content={content}
        selectable={!signedAt && hasSelectableItems(content)}
        deselected={deselected}
        onToggleItem={(key) =>
          setDeselected((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
          })
        }
      />
      <SignatureSection
        slug={slug!}
        brand={content.brand}
        signedAt={signedAt}
        deselected={deselected}
        total={adjustedTotal}
      />
    </>
  )
}
