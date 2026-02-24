import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileUpload } from '@/components/shared/FileUpload'
import { TipTapEditor } from '@/components/shared/TipTapEditor'

type Step = 'compose' | 'processing' | 'preview' | 'submitting' | 'success'

interface TicketFormProps {
  onSubmitted: () => void
}

export function TicketForm({ onSubmitted }: TicketFormProps) {
  const { user } = useAuth()
  const { activeOrg } = useOrg()

  const [step, setStep] = useState<Step>('compose')
  const [rawMessage, setRawMessage] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)

  // AI-processed fields
  const [title, setTitle] = useState('')
  const [processedContent, setProcessedContent] = useState('')

  const charCount = rawMessage.length
  const maxChars = 5000

  async function handleReview(e: FormEvent) {
    e.preventDefault()
    if (!rawMessage.trim()) return

    setError(null)
    setStep('processing')

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'process-ticket',
        { body: { raw_message: rawMessage } },
      )

      if (fnError) throw fnError

      if (data.success) {
        setTitle(data.title)
        setProcessedContent(data.processed_content)
        setStep('preview')
      } else {
        setError(data.rejection_reason ?? 'Request was too vague. Please add more details.')
        setStep('compose')
      }
    } catch {
      setError('Failed to process your request. Please try again.')
      setStep('compose')
    }
  }

  async function handleSubmit() {
    if (!user || !activeOrg) return

    setStep('submitting')
    setError(null)

    try {
      // Create ticket
      const { data: ticket, error: insertError } = await supabase
        .from('tickets')
        .insert({
          organization_id: activeOrg.id,
          user_id: user.id,
          title,
          raw_message: rawMessage,
          processed_content: processedContent,
          status: 'submitted',
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // Upload files and create attachment records
      for (const file of files) {
        const filePath = `${ticket.id}/${crypto.randomUUID()}-${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(filePath, file)

        if (uploadError) {
          console.error('File upload failed:', uploadError)
          continue
        }

        await supabase.from('ticket_attachments').insert({
          ticket_id: ticket.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
        })
      }

      // Increment tickets_used
      await supabase.rpc('increment_tickets_used', {
        org_id: activeOrg.id,
      }).then(({ error: rpcError }) => {
        // Fallback: direct update if RPC doesn't exist yet
        if (rpcError) {
          return supabase
            .from('organizations')
            .update({ tickets_used: activeOrg.tickets_used + 1 })
            .eq('id', activeOrg.id)
        }
      })

      setStep('success')
      setTimeout(() => {
        setRawMessage('')
        setFiles([])
        setTitle('')
        setProcessedContent('')
        setStep('compose')
        onSubmitted()
      }, 1500)
    } catch {
      setError('Failed to submit ticket. Please try again.')
      setStep('preview')
    }
  }

  if (step === 'success') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-6 py-8 text-center">
        <h3 className="mb-2 font-medium text-green-900">Ticket Submitted</h3>
        <p className="text-sm text-green-700">
          Your maintenance request has been submitted successfully.
        </p>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="mb-4 size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Processing your request...</p>
      </div>
    )
  }

  if (step === 'preview' || step === 'submitting') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ticket-title">Ticket Title</Label>
          <Input
            id="ticket-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ticket title"
          />
        </div>

        <div className="space-y-2">
          <Label>Structured Request</Label>
          <TipTapEditor
            content={processedContent}
            onUpdate={setProcessedContent}
            editable
          />
        </div>

        {files.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {files.length} file{files.length > 1 ? 's' : ''} attached
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep('compose')}
            disabled={step === 'submitting'}
          >
            Back to Edit
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={step === 'submitting' || !title.trim()}
          >
            {step === 'submitting' ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Ticket'
            )}
          </Button>
        </div>
      </div>
    )
  }

  // compose step
  return (
    <form onSubmit={handleReview} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="request">Describe your request</Label>
        <Textarea
          id="request"
          value={rawMessage}
          onChange={(e) => setRawMessage(e.target.value.slice(0, maxChars))}
          placeholder="Describe what you need help with. Be as specific as possible — include URLs, page names, and what changes you'd like made."
          rows={8}
          className="resize-y"
        />
        <p className="text-xs text-muted-foreground text-right">
          {charCount.toLocaleString()} / {maxChars.toLocaleString()}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Attachments</Label>
        <FileUpload files={files} onFilesChange={setFiles} />
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={!rawMessage.trim()}>
        Review Ticket
      </Button>
    </form>
  )
}
