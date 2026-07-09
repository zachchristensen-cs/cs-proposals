import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ProposalContent } from '@/types/database'
import { ProposalRenderer } from './renderer/ProposalRenderer'

export function PublicProposalPage() {
  const { slug } = useParams<{ slug: string }>()
  const [content, setContent] = useState<ProposalContent | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) {
      setNotFound(true)
      setLoading(false)
      return
    }

    async function load() {
      const { data, error } = await supabase
        .from('proposals')
        .select('content, client_name')
        .eq('slug', slug!)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setContent(data.content as ProposalContent)
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

  return <ProposalRenderer content={content} />
}
