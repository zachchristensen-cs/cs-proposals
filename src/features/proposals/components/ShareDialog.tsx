import { useEffect, useState } from 'react'
import { Copy, Check, Link as LinkIcon, Plus, Trash2, Eye } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ProposalRecipient, ProposalView } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'

interface ShareDialogProps {
  proposalId: string
  slug: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ViewWithRecipient = ProposalView & {
  proposal_recipients: Pick<ProposalRecipient, 'name' | 'email'> | null
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function ShareDialog({ proposalId, slug, open, onOpenChange }: ShareDialogProps) {
  const [recipients, setRecipients] = useState<ProposalRecipient[]>([])
  const [views, setViews] = useState<ViewWithRecipient[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const genericLink = `${window.location.origin}/p/${slug}`

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function load() {
      const [recipientsRes, viewsRes] = await Promise.all([
        supabase
          .from('proposal_recipients')
          .select('*')
          .eq('proposal_id', proposalId)
          .order('created_at', { ascending: true }),
        supabase
          .from('proposal_views')
          .select('*, proposal_recipients(name, email)')
          .eq('proposal_id', proposalId)
          .order('started_at', { ascending: false })
          .limit(50),
      ])
      if (cancelled) return
      if (recipientsRes.data) setRecipients(recipientsRes.data as ProposalRecipient[])
      if (viewsRes.data) setViews(viewsRes.data as ViewWithRecipient[])
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open, proposalId])

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    toast.success('Link copied to clipboard')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  async function handleAdd() {
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error('Enter a valid email')
      return
    }
    setAdding(true)
    const { data, error } = await supabase
      .from('proposal_recipients')
      .insert({ proposal_id: proposalId, name: name.trim(), email: trimmedEmail })
      .select()
      .single()
    setAdding(false)
    if (error || !data) {
      toast.error('Failed to add recipient')
      return
    }
    setRecipients((prev) => [...prev, data as ProposalRecipient])
    setName('')
    setEmail('')
    copy(`${genericLink}?r=${(data as ProposalRecipient).token}`, (data as ProposalRecipient).id)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('proposal_recipients').delete().eq('id', id)
    if (error) {
      toast.error('Failed to remove recipient')
      return
    }
    setRecipients((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share proposal</DialogTitle>
          <DialogDescription>
            Send each person their own link so you can see who viewed the proposal.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="share">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="share">Recipients</TabsTrigger>
            <TabsTrigger value="activity">
              Activity{views.length > 0 ? ` (${views.length})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="share" className="space-y-4">
            {/* Generic link */}
            <div className="flex items-center gap-2 rounded-md border border-border/50 p-2">
              <LinkIcon className="ml-1 size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-sm text-muted-foreground">{genericLink}</span>
              <Button variant="ghost" size="sm" onClick={() => copy(genericLink, 'generic')}>
                {copiedKey === 'generic' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              </Button>
            </div>

            {/* Add recipient */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="Name (optional)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Input
                  placeholder="email@company.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
              </div>
              <Button size="sm" onClick={handleAdd} disabled={adding}>
                <Plus className="mr-1 size-3.5" />
                Add
              </Button>
            </div>

            {/* Recipient list */}
            {recipients.length > 0 && (
              <div className="space-y-1">
                {recipients.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{r.name || r.email}</p>
                      {r.name && (
                        <p className="truncate text-xs text-muted-foreground">{r.email}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copy(`${genericLink}?r=${r.token}`, r.id)}
                    >
                      {copiedKey === r.id ? (
                        <Check className="mr-1 size-3.5" />
                      ) : (
                        <Copy className="mr-1 size-3.5" />
                      )}
                      Copy link
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity">
            {views.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Eye className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No views yet. Activity appears here when someone opens the proposal.
                </p>
              </div>
            ) : (
              <div className="max-h-80 space-y-1 overflow-y-auto">
                {views.map((v) => {
                  const sections = Array.isArray(v.sections_viewed) ? v.sections_viewed : []
                  return (
                    <div key={v.id} className="rounded-md border border-border/50 px-3 py-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium">
                          {v.proposal_recipients
                            ? v.proposal_recipients.name || v.proposal_recipients.email
                            : 'Unknown viewer'}
                        </p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatWhen(v.started_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDuration(v.duration_seconds)} on page &middot; scrolled{' '}
                        {v.max_scroll_pct}%
                        {sections.length > 0 ? ` · ${sections.length} sections viewed` : ''}
                      </p>
                      {sections.length > 0 && (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                          {sections.join(', ')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
