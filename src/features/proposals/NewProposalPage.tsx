import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { ProposalContent, ProposalAttachment } from '@/types/database'
import { Button } from '@/components/ui/button'
import { generateSlug } from './lib/slugGenerator'
import { useProposalChat } from './hooks/useProposalChat'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { toast } from 'sonner'

interface LocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

export function NewProposalPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const onStreamUpdate = useCallback((assistantId: string, text: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, content: text } : m)),
    )
  }, [])

  const { isStreaming, isGenerating, streamChat } = useProposalChat({ onStreamUpdate })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch current user's team profile for auto-assigning contact
  useEffect(() => {
    if (!user) return
    async function loadStaff() {
      const { data } = await supabase.rpc('get_agency_staff')
      const staff = (data as TeamMember[]) ?? []
      const me = staff.find((m) => m.id === user!.id)
      if (me) setCurrentMember(me)
    }
    loadStaff()
  }, [user])

  async function handleSend(text: string, attachments?: ProposalAttachment[]) {
    if ((!text.trim() && !attachments?.length) || isStreaming) return

    // Build the message content — include extracted text from attachments
    let messageContent = text.trim()
    if (attachments?.length) {
      const attachmentTexts = attachments
        .filter((a) => a.extracted_text)
        .map((a) => `[Attached file: ${a.file_name}]\n${a.extracted_text}`)
      if (attachmentTexts.length) {
        messageContent += '\n\n' + attachmentTexts.join('\n\n')
      }
    }

    const userMsg: LocalMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageContent,
    }
    const assistantMsg: LocalMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])

    const allMessages = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const result = await streamChat(allMessages, assistantMsg.id, {})

    if (!result) return

    const { displayText, proposalUpdate } = result

    // If Claude generated a proposal, create it in the DB and navigate
    if (proposalUpdate && user) {
      const slug = generateSlug()
      const clientName = proposalUpdate.client_name ?? proposalUpdate.cover?.client_name ?? 'Untitled'
      const tier = proposalUpdate.tier ?? null

      // Remove top-level DB fields from content
      const { client_name: _cn, tier: _t, ...content } = proposalUpdate as ProposalContent & { client_name?: string; tier?: number }

      // Auto-assign current user as proposal contact
      if (!content.contact && currentMember) {
        content.contact = {
          name: currentMember.full_name || currentMember.email,
          email: currentMember.email,
          phone: '',
        }
      }

      const { data: newProposal, error: insertError } = await supabase
        .from('proposals')
        .insert({
          slug,
          client_name: clientName,
          tier,
          content: content as unknown,
          created_by: user.id,
        })
        .select('id')
        .single()

      if (insertError) {
        toast.error('Failed to save proposal')
        return
      }

      if (newProposal) {
        // Save all messages
        const messagesToSave = [...messages, userMsg, { ...assistantMsg, content: displayText }]
          .filter((m) => m.content)
          .map((m) => ({
            proposal_id: newProposal.id,
            role: m.role,
            content: m.content,
          }))

        await supabase.from('proposal_messages').insert(messagesToSave)

        navigate(`/admin/proposals/${newProposal.id}`, { replace: true })
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Button variant="ghost" size="icon" className="-ml-2" asChild>
          <Link to="/admin/proposals">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-sm font-medium">New Proposal</h1>
      </div>

      {messages.length === 0 ? (
        /* Empty state — heading + input centered together */
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <div className="w-full max-w-2xl">
            <div className="mb-5 text-center">
              <p className="font-serif text-2xl tracking-tight">Start a new proposal</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Describe the client and project, or paste a call transcript.
              </p>
            </div>
            <ChatInput onSend={handleSend} disabled={isStreaming} />
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className="chat-scroll flex-1 overflow-y-auto">
            <div className="mx-auto max-w-2xl space-y-5 px-5 py-6">
              {messages.map((msg, idx) => {
                const isLastAssistant =
                  msg.role === 'assistant' &&
                  idx === messages.length - 1 &&
                  !isStreaming
                return (
                  <ChatMessage
                    key={msg.id}
                    role={msg.role}
                    content={msg.content}
                    isStreaming={isStreaming && msg.role === 'assistant' && msg === messages[messages.length - 1]}
                    isGenerating={isGenerating && msg.role === 'assistant' && msg === messages[messages.length - 1]}
                    isLastAssistant={isLastAssistant}
                    onOptionClick={(letter) => handleSend(letter)}
                  />
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div className="px-5 py-4">
            <div className="mx-auto max-w-2xl">
              <ChatInput onSend={handleSend} disabled={isStreaming} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
