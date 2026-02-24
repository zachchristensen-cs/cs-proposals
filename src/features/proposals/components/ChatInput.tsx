import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Paperclip, X, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { ProposalAttachment } from '@/types/database'

interface ChatInputProps {
  onSend: (text: string, attachments?: ProposalAttachment[]) => void
  disabled?: boolean
  proposalId?: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const PASTE_COLLAPSE_THRESHOLD = 500

interface PastedText {
  id: string
  content: string
  preview: string
  lineCount: number
}

export function ChatInput({ onSend, disabled, proposalId }: ChatInputProps) {
  const [text, setText] = useState('')
  const [pendingFiles, setPendingFiles] = useState<ProposalAttachment[]>([])
  const [pastedTexts, setPastedTexts] = useState<PastedText[]>([])
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 280) + 'px'
  }, [text])

  function handleSubmit() {
    const hasText = text.trim().length > 0
    const hasAttachments = pendingFiles.length > 0 || pastedTexts.length > 0
    if ((!hasText && !hasAttachments) || disabled || uploading) return

    const allAttachments: ProposalAttachment[] = [
      ...pendingFiles,
      ...pastedTexts.map((p) => ({
        file_name: `Pasted text (${p.lineCount} lines)`,
        file_path: '',
        file_size: p.content.length,
        file_type: 'text/plain',
        extracted_text: p.content,
      })),
    ]

    onSend(text, allAttachments.length > 0 ? allAttachments : undefined)
    setText('')
    setPendingFiles([])
    setPastedTexts([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const pastedContent = e.clipboardData.getData('text/plain')
    if (pastedContent.length >= PASTE_COLLAPSE_THRESHOLD) {
      e.preventDefault()
      const lines = pastedContent.split('\n')
      const firstLine = lines[0].slice(0, 60).trim()
      const preview = firstLine + (firstLine.length < lines[0].length ? '...' : '')

      setPastedTexts((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          content: pastedContent,
          preview: preview || 'Pasted text',
          lineCount: lines.length,
        },
      ])
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 10MB limit`)
        continue
      }
      await uploadFile(file)
    }

    e.target.value = ''
  }

  async function uploadFile(file: File) {
    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Not authenticated')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      if (proposalId) formData.append('proposal_id', proposalId)

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proposal-upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        },
      )

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }))
        toast.error(err.error || 'Upload failed')
        return
      }

      const data = await res.json()
      setPendingFiles((prev) => [
        ...prev,
        {
          file_name: data.file_name,
          file_path: data.file_path,
          file_size: data.file_size,
          file_type: data.file_type,
          extracted_text: data.extracted_text,
        },
      ])
    } catch {
      toast.error('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function removePastedText(id: string) {
    setPastedTexts((prev) => prev.filter((p) => p.id !== id))
  }

  const hasChips = pendingFiles.length > 0 || pastedTexts.length > 0
  const hasContent = text.trim().length > 0 || hasChips

  return (
    <div className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-sm transition-shadow duration-200 focus-within:border-border focus-within:shadow-md">
      {/* Attachment chips — inside the container */}
      {hasChips && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {pastedTexts.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-1.5 rounded-lg bg-muted/80 px-2.5 py-1.5 text-xs"
            >
              <FileText className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <span className="block max-w-[180px] truncate font-medium">{p.preview}</span>
                <span className="text-muted-foreground">{p.lineCount} lines</span>
              </div>
              <button
                onClick={() => removePastedText(p.id)}
                className="ml-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {pendingFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg bg-muted/80 px-2.5 py-1.5 text-xs"
            >
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="max-w-[150px] truncate">{file.file_name}</span>
              <button
                onClick={() => removeFile(i)}
                className="ml-0.5 shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row — all inside the unified container */}
      <div className="flex items-end gap-1 px-2 py-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept=".txt,.md,.csv,.pdf,.png,.jpg,.jpeg,.gif,.webp"
          multiple
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground disabled:opacity-40"
        >
          <Paperclip className="size-[18px]" strokeWidth={1.75} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            uploading
              ? 'Uploading...'
              : disabled
                ? 'Thinking...'
                : 'Describe the project or paste a transcript...'
          }
          disabled={disabled || uploading}
          rows={1}
          className="flex-1 resize-none bg-transparent px-1 py-1.5 text-[14px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-40"
          style={{ transition: 'height 150ms ease-out' }}
        />

        <button
          onClick={handleSubmit}
          disabled={disabled || uploading || !hasContent}
          className="mb-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground text-background transition-all duration-150 hover:bg-foreground/90 disabled:bg-muted-foreground/20 disabled:text-muted-foreground/40"
        >
          <ArrowUp className="size-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
