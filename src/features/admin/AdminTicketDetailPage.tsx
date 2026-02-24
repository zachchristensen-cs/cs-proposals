import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  FileText,
  Film,
  ImageIcon,
  RefreshCw,
  Send,
  CheckCircle2,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Ticket, TicketAttachment } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TipTapEditor } from '@/components/shared/TipTapEditor'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="size-5 text-blue-500" />
  if (type.startsWith('video/')) return <Film className="size-5 text-purple-500" />
  return <FileText className="size-5 text-orange-500" />
}

export function AdminTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [orgName, setOrgName] = useState('')
  const [submitterEmail, setSubmitterEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [notionStatus, setNotionStatus] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!id) return

    async function fetchTicket() {
      const { data, error } = await supabase
        .from('tickets')
        .select('*, organization:organizations(name), user:users(email)')
        .eq('id', id!)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const org = data.organization as unknown as { name: string } | null
      const user = data.user as unknown as { email: string } | null
      setOrgName(org?.name ?? 'Unknown')
      setSubmitterEmail(user?.email ?? 'Unknown')

      // Strip the join fields before setting ticket
      const { organization: _o, user: _u, ...ticketData } = data
      setTicket(ticketData as unknown as Ticket)

      const { data: files } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', id!)
        .order('created_at')

      setAttachments((files as TicketAttachment[]) ?? [])
      setLoading(false)

      // Check notion status if synced
      if (data.notion_page_id) {
        checkNotionStatus(id!)
      }
    }

    fetchTicket()
  }, [id])

  async function checkNotionStatus(ticketId: string) {
    try {
      const { data, error } = await supabase.functions.invoke('get-notion-status', {
        body: { ticket_id: ticketId },
      })
      if (!error && data?.status) {
        setNotionStatus(data.status)
      }
    } catch {
      // Silently fail — Notion may not be configured
    }
  }

  async function handleReprocess() {
    if (!ticket) return
    setReprocessing(true)
    setActionMessage(null)

    try {
      const { data, error } = await supabase.functions.invoke('process-ticket', {
        body: { raw_message: ticket.raw_message },
      })

      if (error) throw error
      if (!data?.success) {
        setActionMessage({ type: 'error', text: data?.rejection_reason ?? 'Processing failed' })
        return
      }

      // Update the ticket with new processed content
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          title: data.title,
          processed_content: data.processed_content,
        })
        .eq('id', ticket.id)

      if (updateError) throw updateError

      setTicket({ ...ticket, title: data.title, processed_content: data.processed_content })
      setActionMessage({ type: 'success', text: 'Ticket reprocessed successfully' })

      // Auto-sync to Notion if configured
      if (ticket.notion_page_id) {
        handleSyncToNotion()
      }
    } catch (err) {
      setActionMessage({ type: 'error', text: `Reprocess failed: ${err}` })
    } finally {
      setReprocessing(false)
    }
  }

  async function handleSyncToNotion() {
    if (!ticket) return
    setSyncing(true)
    setActionMessage(null)

    try {
      const { data, error } = await supabase.functions.invoke('sync-to-notion', {
        body: { ticket_id: ticket.id },
      })

      if (error) throw error

      if (data?.notion_page_id) {
        setTicket({ ...ticket, notion_page_id: data.notion_page_id })
        setNotionStatus(data.status ?? 'synced')
      }

      setActionMessage({ type: 'success', text: 'Synced to Notion successfully' })
    } catch (err) {
      setActionMessage({ type: 'error', text: `Notion sync failed: ${err}` })
    } finally {
      setSyncing(false)
    }
  }

  async function handleMarkDone() {
    if (!ticket) return
    setCompleting(true)
    setActionMessage(null)

    try {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('tickets')
        .update({ status: 'completed', completed_at: now })
        .eq('id', ticket.id)

      if (error) throw error

      setTicket({ ...ticket, status: 'completed', completed_at: now })

      // Send notification
      await supabase.functions.invoke('send-notification', {
        body: {
          event_type: 'ticket_completed',
          data: { ticket_id: ticket.id, organization_id: ticket.organization_id },
        },
      })

      setActionMessage({ type: 'success', text: 'Ticket marked as completed' })
    } catch (err) {
      setActionMessage({ type: 'error', text: `Failed to complete: ${err}` })
    } finally {
      setCompleting(false)
    }
  }

  async function downloadFile(attachment: TicketAttachment) {
    const { data } = await supabase.storage
      .from('ticket-attachments')
      .createSignedUrl(attachment.file_path, 60)

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <PageWrapper title="Loading...">
        <div className="py-8 text-center text-sm text-muted-foreground">Loading ticket...</div>
      </PageWrapper>
    )
  }

  if (notFound || !ticket) {
    return (
      <PageWrapper title="Not Found">
        <div className="py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Ticket not found.</p>
          <Button variant="outline" asChild>
            <Link to="/admin/maintenance">Back to Maintenance</Link>
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title={ticket.title}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/admin/maintenance">
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <StatusBadge status={ticket.status} />
        <span className="text-sm text-muted-foreground">
          {orgName} · {submitterEmail}
        </span>
        <span className="text-sm text-muted-foreground">
          {new Date(ticket.created_at).toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

      {/* Action Message */}
      {actionMessage && (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${
            actionMessage.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      {/* Admin Actions */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReprocess}
              disabled={reprocessing}
            >
              {reprocessing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Reprocess AI
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncToNotion}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Send className="mr-2 size-4" />
              )}
              Sync to Notion
            </Button>

            {ticket.status !== 'completed' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={completing}>
                    {completing ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 size-4" />
                    )}
                    Mark as Done
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mark ticket as completed?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will set the ticket status to completed and send a notification email to the client.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleMarkDone}>Complete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Notion Status */}
            {ticket.notion_page_id && (
              <span className="text-xs text-muted-foreground">
                Notion: {notionStatus ?? 'synced'}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="dev-ticket">
        <TabsList>
          <TabsTrigger value="dev-ticket">Dev Ticket</TabsTrigger>
          <TabsTrigger value="original">Original Request</TabsTrigger>
          <TabsTrigger value="attachments">
            Attachments{attachments.length > 0 ? ` (${attachments.length})` : ''}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dev-ticket" className="mt-4">
          {ticket.processed_content ? (
            <div className="prose prose-sm max-w-none">
              <TipTapEditor content={ticket.processed_content} editable={false} />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This ticket has not been processed yet.
            </p>
          )}
        </TabsContent>

        <TabsContent value="original" className="mt-4">
          <div className="whitespace-pre-wrap rounded-md border bg-muted/50 p-4 text-sm">
            {ticket.raw_message}
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          {attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attachments.</p>
          ) : (
            <div className="space-y-3">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted">
                    <AttachmentIcon type={att.file_type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(att.file_size)}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => downloadFile(att)}>
                    <Download className="mr-1 size-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageWrapper>
  )
}
