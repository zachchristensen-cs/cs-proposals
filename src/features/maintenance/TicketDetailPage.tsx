import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Film, ImageIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/contexts/OrgContext'
import type { Ticket, TicketAttachment } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { TipTapEditor } from '@/components/shared/TipTapEditor'

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

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { activeOrg } = useOrg()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [attachments, setAttachments] = useState<TicketAttachment[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id || !activeOrg) return

    async function fetchTicket() {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', id!)
        .eq('organization_id', activeOrg!.id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setTicket(data as Ticket)

      const { data: files } = await supabase
        .from('ticket_attachments')
        .select('*')
        .eq('ticket_id', id!)
        .order('created_at')

      setAttachments((files as TicketAttachment[]) ?? [])
      setLoading(false)
    }

    fetchTicket()
  }, [id, activeOrg])

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
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading ticket...
        </div>
      </PageWrapper>
    )
  }

  if (notFound || !ticket) {
    return (
      <PageWrapper title="Not Found">
        <div className="py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            Ticket not found or you don&apos;t have access.
          </p>
          <Button variant="outline" asChild>
            <Link to="/dashboard/maintenance">Back to Maintenance</Link>
          </Button>
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title={ticket.title}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/maintenance">
            <ArrowLeft className="mr-1 size-4" />
            Back
          </Link>
        </Button>
        <StatusBadge status={ticket.status} />
        <span className="text-sm text-muted-foreground">
          Submitted{' '}
          {new Date(ticket.created_at).toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
      </div>

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
              <TipTapEditor
                content={ticket.processed_content}
                editable={false}
              />
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
                  {att.file_type.startsWith('image/') ? (
                    <button
                      onClick={() => downloadFile(att)}
                      className="shrink-0"
                    >
                      <img
                        src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/ticket-attachments/${att.file_path}`}
                        alt={att.file_name}
                        className="size-16 rounded object-cover"
                        onError={(e) => {
                          // Private bucket, thumbnail won't load — use icon
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove(
                            'hidden',
                          )
                        }}
                      />
                      <div className="hidden flex size-16 items-center justify-center rounded bg-muted">
                        <AttachmentIcon type={att.file_type} />
                      </div>
                    </button>
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded bg-muted">
                      <AttachmentIcon type={att.file_type} />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sm">{att.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(att.file_size)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadFile(att)}
                  >
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
