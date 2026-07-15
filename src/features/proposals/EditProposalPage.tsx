import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Share2, Download, User, Play, MessageSquare, Undo2, Redo2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Proposal, ProposalContent, ProposalMessage, ProposalAttachment } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProposalRenderer } from './renderer'
import { ChatMessage } from './components/ChatMessage'
import { ChatInput } from './components/ChatInput'
import { SaveIndicator } from './components/SaveIndicator'
import { VersionHistory } from './components/VersionHistory'
import { recalculateTotals } from './lib/recalculateTotals'
import { mergeProposalUpdate } from './lib/mergeProposalUpdate'
import { useUndoStack } from './hooks/useUndoStack'
import { useProposalChat } from './hooks/useProposalChat'
import { downloadProposalPdf } from './lib/downloadPdf'
import { PresentationMode } from './presentation'
import { ShareDialog } from './components/ShareDialog'
import { toast } from 'sonner'

function InlineRename({
  value,
  placeholder,
  onSave,
}: {
  value: string
  placeholder: string
  onSave: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function save() {
    setEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) {
      onSave(trimmed)
    } else {
      setDraft(value)
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); save() }
          if (e.key === 'Escape') { setEditing(false); setDraft(value) }
        }}
        className="flex-1 truncate rounded border border-ring bg-white px-2 py-0.5 text-sm font-medium outline-none"
      />
    )
  }

  return (
    <h1
      onClick={() => setEditing(true)}
      className="flex-1 cursor-pointer truncate rounded px-2 py-0.5 text-sm font-medium transition-colors hover:bg-muted"
      title="Click to rename"
    >
      {value || placeholder}
    </h1>
  )
}

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [shareOpen, setShareOpen] = useState(false)
  const [presenting, setPresenting] = useState(false)
  const [chatCollapsed, setChatCollapsed] = useState(false)
  const [chatWidth, setChatWidth] = useState(40) // percentage
  const isDragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const contentRef = useRef<ProposalContent | null>(null)
  const { pushUndo, popUndo, popRedo, canUndo, canRedo } = useUndoStack()

  const onStreamUpdate = useCallback((assistantId: string, text: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantId ? { ...m, content: text } : m)),
    )
  }, [])

  const { isStreaming, isGenerating, streamChat } = useProposalChat({ onStreamUpdate })

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

  // Keep contentRef in sync for keyboard handler
  useEffect(() => {
    contentRef.current = content
  }, [content])

  // Debounced save
  const saveContent = useCallback(
    (updatedContent: ProposalContent) => {
      if (!id) return
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

      setSaveStatus('saving')
      saveTimeoutRef.current = setTimeout(async () => {
        const clientName = updatedContent.cover?.client_name ?? proposal?.client_name
        const { error } = await supabase
          .from('proposals')
          .update({
            content: updatedContent as unknown,
            client_name: clientName,
          })
          .eq('id', id)

        if (error) {
          setSaveStatus('error')
          toast.error('Failed to save changes')
        } else {
          setSaveStatus('saved')
          setTimeout(() => setSaveStatus('idle'), 2000)

          // Fire-and-forget version snapshot
          if (user) {
            supabase
              .from('proposal_versions')
              .insert({
                proposal_id: id,
                content: updatedContent as unknown,
                client_name: clientName,
                created_by: user.id,
              })
              .then(() => {})
          }
        }
      }, 1000)
    },
    [id, proposal?.client_name, user],
  )

  function handleContentChange(updatedContent: ProposalContent) {
    // Push current state to undo stack before applying changes
    if (content) pushUndo(content)
    const recalculated = recalculateTotals(updatedContent)
    setContent(recalculated)
    saveContent(recalculated)
  }

  function handleUndo() {
    if (!contentRef.current) return
    const previous = popUndo(contentRef.current)
    if (previous) {
      setContent(previous)
      saveContent(previous)
    }
  }

  function handleRedo() {
    if (!contentRef.current) return
    const next = popRedo(contentRef.current)
    if (next) {
      setContent(next)
      saveContent(next)
    }
  }

  // Keyboard shortcuts: Cmd+Z / Cmd+Shift+Z
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSend(text: string, attachments?: ProposalAttachment[]) {
    if ((!text.trim() && !attachments?.length) || isStreaming || !id || !content) return

    // Build the display/DB message content (text only — no base64)
    let messageContent = text.trim()
    if (attachments?.length) {
      const attachmentTexts = attachments
        .filter((a) => a.extracted_text)
        .map((a) => `[Attached file: ${a.file_name}]\n${a.extracted_text}`)
      if (attachmentTexts.length) {
        messageContent += '\n\n' + attachmentTexts.join('\n\n')
      }
    }

    // Build multimodal API content for Claude (PDFs/images as native content blocks)
    let apiContent: string | Array<Record<string, unknown>> = messageContent

    if (attachments?.length) {
      const blocks: Array<Record<string, unknown>> = []

      for (const att of attachments) {
        if (att.base64 && att.file_type === 'application/pdf') {
          blocks.push({
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: att.base64 },
          })
        } else if (att.base64 && att.file_type.startsWith('image/')) {
          blocks.push({
            type: 'image',
            source: { type: 'base64', media_type: att.file_type, data: att.base64 },
          })
        }
      }

      if (blocks.length > 0) {
        if (messageContent) blocks.push({ type: 'text', text: messageContent })
        apiContent = blocks
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

    // Snapshot the content at send time — used to detect which sections Claude changed
    const contentSnapshot = structuredClone(content)

    // Previous messages use plain text, current message uses multimodal content
    const allMessages = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: apiContent },
    ]

    const result = await streamChat(allMessages, assistantMsg.id, {
      proposal_id: id,
      current_content: content,
    })

    if (!result) return

    const { displayText, proposalUpdate } = result

    if (proposalUpdate) {
      const { client_name: _cn, tier: _t, ...updatedFields } = proposalUpdate as ProposalContent & { client_name?: string; tier?: number }
      // Selective merge: only apply sections Claude actually changed vs what was sent.
      // Preserves manual edits the user made while Claude was streaming.
      const currentContent = contentRef.current ?? content
      const merged = mergeProposalUpdate(currentContent, contentSnapshot, updatedFields)
      handleContentChange(merged)
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
    <ShareDialog
      proposalId={proposal.id}
      slug={proposal.slug}
      open={shareOpen}
      onOpenChange={setShareOpen}
    />
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-5">
        <Button variant="ghost" size="icon" className="-ml-2" asChild>
          <Link to="/admin/proposals">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <InlineRename
          value={proposal.client_name || ''}
          placeholder="Untitled"
          onSave={async (name) => {
            const { error } = await supabase
              .from('proposals')
              .update({ client_name: name })
              .eq('id', id!)
            if (error) {
              toast.error('Failed to rename')
              return
            }
            setProposal((prev) => prev ? { ...prev, client_name: name } : prev)
          }}
        />
        <SaveIndicator status={saveStatus} />
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleUndo}
            disabled={!canUndo()}
            title="Undo (Cmd+Z)"
          >
            <Undo2 className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleRedo}
            disabled={!canRedo()}
            title="Redo (Cmd+Shift+Z)"
          >
            <Redo2 className="size-3.5" />
          </Button>
        </div>
        <VersionHistory
          proposalId={id!}
          onRestore={(restored) => handleContentChange(restored)}
        />
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
            <SelectItem value="signed">Signed</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 className="mr-1.5 size-3.5" />
          Share
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
          onClick={() => downloadProposalPdf(content.cover?.client_name || proposal.client_name || undefined)}
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

        {/* Drag handle — invisible strip over the border, shows line + collapse button on hover */}
        {!chatCollapsed && (
          <div
            className="group absolute top-0 bottom-0 z-10 w-4 cursor-col-resize"
            style={{ left: `${chatWidth}%`, transform: 'translateX(-50%)' }}
            onMouseDown={handleMouseDown}
          >
            <div className="h-full w-px mx-auto opacity-0 bg-primary/30 transition group-hover:opacity-100 group-active:opacity-100" />
            <button
              onClick={(e) => { e.stopPropagation(); setChatCollapsed(true) }}
              onMouseDown={(e) => e.stopPropagation()}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-foreground group-hover:opacity-100"
              title="Hide chat"
            >
              <ArrowLeft className="size-3" />
            </button>
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
