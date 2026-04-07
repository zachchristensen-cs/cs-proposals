import { useState, useRef, useCallback } from 'react'
import { streamEdgeFunction } from '@/lib/streaming'
import { parseProposalResponse, stripProposalTags } from '../lib/parseProposalUpdate'
import type { ProposalContent } from '@/types/database'
import { toast } from 'sonner'

interface StreamResult {
  displayText: string
  proposalUpdate: (ProposalContent & { client_name?: string; tier?: number }) | null
}

interface UseProposalChatOptions {
  onStreamUpdate: (assistantId: string, text: string) => void
}

export function useProposalChat({ onStreamUpdate }: UseProposalChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const bufferRef = useRef('')

  const streamChat = useCallback(
    async (
      messages: Array<{ role: string; content: string | Array<Record<string, unknown>> }>,
      assistantId: string,
      edgeFnBody: Record<string, unknown>,
    ): Promise<StreamResult | null> => {
      setIsStreaming(true)
      bufferRef.current = ''

      try {
        const { stream, error } = await streamEdgeFunction('proposal-chat', {
          messages,
          ...edgeFnBody,
        })

        if (error || !stream) {
          const isAuthError =
            error?.toLowerCase().includes('unauthorized') ||
            error?.toLowerCase().includes('session expired') ||
            error?.includes('401')
          const displayError = isAuthError
            ? 'Your session has expired. Please refresh the page and try again.'
            : error || 'Something went wrong. Please try again.'

          onStreamUpdate(assistantId, displayError)
          setIsStreaming(false)
          toast.error(displayError)
          return null
        }

        const reader = stream.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          bufferRef.current += decoder.decode(value, { stream: true })
          const displayText = stripProposalTags(bufferRef.current)

          const generating =
            bufferRef.current.includes('<proposal_update>') &&
            !bufferRef.current.includes('</proposal_update>')
          setIsGenerating(generating)

          onStreamUpdate(assistantId, displayText)
        }
      } catch {
        // Keep partial content visible
      }

      setIsStreaming(false)
      setIsGenerating(false)

      const result = parseProposalResponse(bufferRef.current)
      onStreamUpdate(assistantId, result.displayText)

      return result
    },
    [onStreamUpdate],
  )

  return { isStreaming, isGenerating, streamChat }
}
