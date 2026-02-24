import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Download, User, Play, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Proposal, ProposalContent, ProposalMessage, ProposalAttachment } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProposalRenderer } from './renderer'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { SaveIndicator } from './components/SaveIndicator'
import { parseProposalResponse, stripProposalTags } from './lib/parseProposalUpdate'
import { recalculateTotals } from './lib/recalculateTotals'
import { streamEdgeFunction } from '@/lib/streaming'
import { downloadProposalPdf } from './lib/downloadPdf'
import { PresentationMode } from './presentation'
import { toast } from 'sonner'

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function EditProposalPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [content, setContent] = useState<ProposalContent | null>(null)
  const [messages, setMessages] = useState<ProposalMessage[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [copied, setCopied] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [chatWidth, setChatWidth] = useState(40) // percentage
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Load proposal, messages, and team members
  useEffect(() => {
    if (!id) return

    async function load() {
      const [{ data: proposalData }, { data: messagesData }, { data: staffData }] = await Promise.all([
        supabase.from('proposals').select('*').eq('id', id).single(),
        supabase
          .from('proposal_messages')
          .select('*')
          .eq('proposal_id', id)
          .order('created_at', { ascending: true }),
        supabase.rpc('get_agency_staff'),
      ])

      const staff = (staffData as TeamMember[]) ?? []
      setTeamMembers(staff)

      if (proposalData) {
        setProposal(proposalData as Proposal)
        const proposalContent = proposalData.content as ProposalContent

        // Auto-select current user as assignee if no contact is set
        if (!proposalContent.contact && user && staff.length > 0) {
          const currentUser = staff.find((m) => m.id === user.id)
          if (currentUser) {
            proposalContent.contact = {
              name: currentUser.full_name || currentUser.email,
              email: currentUser.email,
              phone: '',
            }
          }
        }

        setContent(proposalContent)
      }
      setMessages((messagesData as ProposalMessage[]) ?? [])
      setLoading(false)
    }
    load()
  }, [id, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Resize drag handlers
  const SNAP_DEFAULT = 40
  const SNAP_THRESHOLD = 3 // snap when within 3% of default

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      let pct = ((e.clientX - rect.left) / rect.width) * 100
      pct = Math.min(60, Math.max(20, pct))
      // Snap to default
      if (Math.abs(pct - SNAP_DEFAULT) < SNAP_THRESHOLD) pct = SNAP_DEFAULT
      setChatWidth(pct)
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [])

  // Debounced save
  const saveContent = useCallback(
    (updatedContent: ProposalContent) => {
      if (!id) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

      setSaveStatus('saving')
      saveTimeoutRef.current = setTimeout(async () => {
        const { error } = await supabase
          .from('proposals')
          .update({
            content: updatedContent as unknown,
            client_name: updatedContent.cover?.client_name ?? proposal?.client_name,
          })
          .eq('id', id)

        if (error) {
          setSaveStatus('error')
          toast.error('Failed to save changes')
        } else {
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)
        }
      }, 1000)
    },
    [id, proposal?.client_name],
  )

  function handleContentChange(updatedContent: ProposalContent) {
    const recalculated = recalculateTotals(updatedContent)
    setContent(recalculated)
    saveContent(recalculated)
  }

  async function handleSend(text: string, attachments?: ProposalAttachment[]) {
    if ((!text.trim() && !attachments?.length) || isStreaming || !id || !content) return

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

    const userMsg: ProposalMessage = {
      id: crypto.randomUUID(),
      proposal_id: id,
      role: 'user',
      content: messageContent,
      attachments: attachments ?? [],
      created_at: new Date().toISOString(),
    }
    const assistantMsg: ProposalMessage = {
      id: crypto.randomUUID(),
      proposal_id: id,
      role: 'assistant',
      content: '',
      attachments: [],
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    setIsStreaming(true)

    let buffer = ''

    try {
      const allMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const { stream, error } = await streamEdgeFunction('proposal-chat', {
        messages: allMessages,
        proposal_id: id,
        current_content: content,
      })

      if (error || !stream) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: 'Something went wrong. Please try again.' }
              : m,
          ),
        )
        setIsStreaming(false)
        toast.error('Failed to connect. Please try again.')
        return
      }

      const reader = stream.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const displayText = stripProposalTags(buffer)

        // Detect when proposal JSON is being generated
        const generating = buffer.includes('<proposal_update>') && !buffer.includes('</proposal_update>')
        setIsGenerating(generating)

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: displayText } : m,
          ),
        )
      }
    } catch {
      // Keep partial content
    }

    setIsStreaming(false)
    setIsGenerating(false)

    const { displayText, proposalUpdate } = parseProposalResponse(buffer)

    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsg.id ? { ...m, content: displayText } : m,
      ),
    )

    if (proposalUpdate) {
      const { client_name: _cn, tier: _t, ...updatedContent } = proposalUpdate as ProposalContent & { client_name?: string; tier?: number }
      handleContentChange(updatedContent as ProposalContent)
    }

    // Save messages to DB
    await supabase.from('proposal_messages').insert([
      { proposal_id: id, role: 'user', content: messageContent },
      { proposal_id: id, role: 'assistant', content: displayText },
    ])
  }

  async function handleStatusChange(status: string) {
    if (!id) return
    const { error } = await supabase.from('proposals').update({ status }).eq('id', id)
    if (error) {
      toast.error('Failed to update status')
      return
    }
    setProposal((prev) => (prev ? { ...prev, status: status as Proposal['status'] } : prev))
    toast.success(`Status changed to ${status}`)
  }

  function handleCopyLink() {
    if (!proposal) return
    const url = `${window.location.origin}/p/${proposal.slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    )
  }

  if (!proposal || !content) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Proposal not found.</p>
      </div>
    )
  }

  return (
    <>
    {presenting && (
      <PresentationMode
        content={content}
        onClose={() => setPresenting(false)}
      />
    )}
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Button variant="ghost" size="icon" className="-ml-2" asChild>
          <Link to="/admin/proposals">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="flex-1 truncate text-sm font-medium">
          {proposal.client_name || 'Untitled'}
        </h1>
        <SaveIndicator status={saveStatus} />
        {teamMembers.length > 0 && (
          <Select
            value={content.contact?.email || user?.email || ''}
            onValueChange={(email) => {
              const member = teamMembers.find((m) => m.email === email)
              if (member) {
                handleContentChange({
                  ...content,
                  contact: {
                    name: member.full_name || member.email,
                    email: member.email,
                    phone: '',
                  },
                })
              }
            }}
          >
            <SelectTrigger className="w-44 gap-2">
              <User className="size-3.5 shrink-0 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {teamMembers.map((m) => (
                <SelectItem key={m.id} value={m.email}>
                  {m.full_name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={proposal.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
          {copied ? 'Copied' : 'Copy Link'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresenting(true)}
        >
          <Play className="mr-1.5 size-3.5" />
          Present
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadProposalPdf()}
        >
          <Download className="mr-1.5 size-3.5" />
          PDF
        </Button>
      </div>

      {/* Split view */}
      <div ref={containerRef} className="relative flex flex-1 overflow-hidden">
        {/* Chat panel */}
        {!chatCollapsed && (
          <div
            className="flex shrink-0 flex-col border-r border-border/50"
            style={{ width: `${chatWidth}%` }}
          >
            <div className="chat-scroll flex-1 overflow-y-auto px-5 py-6">
              <div className="mx-auto max-w-xl space-y-5">
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
                      isStreaming={
                        isStreaming &&
                        msg.role === 'assistant' &&
                        msg === messages[messages.length - 1]
                      }
                      isGenerating={
                        isGenerating &&
                        msg.role === 'assistant' &&
                        msg === messages[messages.length - 1]
                      }
                      isLastAssistant={isLastAssistant}
                      onOptionClick={(letter) => handleSend(letter)}
                    />
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="px-5 py-3">
              <div className="mx-auto max-w-xl">
                <ChatInput onSend={handleSend} disabled={isStreaming} proposalId={id} />
              </div>
            </div>
          </div>
        )}

        {/* Drag handle — invisible 6px strip over the border, shows line on hover */}
        {!chatCollapsed && (
          <div
            className="group absolute top-0 bottom-0 z-10 w-1.5 cursor-col-resize"
            style={{ left: `${chatWidth}%`, transform: 'translateX(-50%)' }}
            onMouseDown={handleMouseDown}
            onDoubleClick={() => setChatCollapsed(true)}
          >
            <div className="h-full w-px mx-auto opacity-0 bg-primary/40 transition group-hover:opacity-100 group-active:opacity-100" />
          </div>
        )}

        {/* Collapsed: tab on left edge to reopen chat */}
        {chatCollapsed && (
          <button
            onClick={() => setChatCollapsed(false)}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 flex h-10 w-5 items-center justify-center rounded-r-md border border-l-0 bg-background text-muted-foreground opacity-0 transition-opacity hover:opacity-100 hover:text-foreground"
            title="Show chat"
          >
            <MessageSquare className="size-3.5" />
          </button>
        )}

        {/* Preview panel */}
        <div className="flex-1 overflow-y-auto">
          <ProposalRenderer
            content={content}
            editable
            onContentChange={handleContentChange}
          />
        </div>
      </div>
    </div>
    </>
  )
}
