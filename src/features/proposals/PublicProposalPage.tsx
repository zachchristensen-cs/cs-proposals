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
        .eq('status', 'sent')
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
      <div className="flex min-h-screen items-center justify-center bg-[#f5f2ed]">
        <p className="text-sm text-[#6B6B6B]">Loading proposal...</p>
      </div>
    )
  }

  if (notFound || !content) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f2ed]">
        <div className="text-center">
          <h1 className="font-serif text-2xl text-[#1A1A1A]">
            This proposal doesn't exist or has been removed.
          </h1>
          <p className="mt-2 text-sm text-[#6B6B6B]">Cambridge Studio</p>
        </div>
      </div>
    )
  }

  return <ProposalRenderer content={content} />
}
