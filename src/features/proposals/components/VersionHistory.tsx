import { useEffect, useState } from 'react'
import { History, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ProposalContent, ProposalVersion } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Compare two snapshots and return a short human-readable summary */
function diffSummary(current: ProposalContent, previous: ProposalContent): string {
  const changes: string[] = []

  // Cover
  if (current.cover?.client_name !== previous.cover?.client_name)
    changes.push('Updated client name')
  else if (current.cover?.description !== previous.cover?.description)
    changes.push('Updated cover description')
  else if (
    current.cover?.date !== previous.cover?.date ||
    current.cover?.timeline !== previous.cover?.timeline ||
    current.cover?.prepared_for !== previous.cover?.prepared_for
  )
    changes.push('Updated cover details')

  // Opportunity
  const curOpp = current.opportunity?.paragraphs ?? []
  const prevOpp = previous.opportunity?.paragraphs ?? []
  if (!previous.opportunity && current.opportunity) changes.push('Added opportunity')
  else if (previous.opportunity && !current.opportunity) changes.push('Removed opportunity')
  else if (curOpp.length !== prevOpp.length) changes.push(`Updated opportunity (${curOpp.length} paragraphs)`)
  else if (JSON.stringify(curOpp) !== JSON.stringify(prevOpp)) changes.push('Edited opportunity text')

  // Personas
  const curPersonas = current.personas?.items ?? []
  const prevPersonas = previous.personas?.items ?? []
  if (!previous.personas && current.personas) changes.push('Added personas')
  else if (previous.personas && !current.personas) changes.push('Removed personas')
  else if (curPersonas.length > prevPersonas.length) changes.push(`Added persona (${curPersonas.length} total)`)
  else if (curPersonas.length < prevPersonas.length) changes.push(`Removed persona (${curPersonas.length} total)`)
  else if (JSON.stringify(curPersonas) !== JSON.stringify(prevPersonas)) changes.push('Edited personas')

  // Phases
  if (current.phases.length > previous.phases.length) changes.push(`Added phase (${current.phases.length} total)`)
  else if (current.phases.length < previous.phases.length) changes.push(`Removed phase (${current.phases.length} total)`)
  else if (JSON.stringify(current.phases) !== JSON.stringify(previous.phases)) {
    // Find which phase changed
    const changedIdx = current.phases.findIndex((p, i) => JSON.stringify(p) !== JSON.stringify(previous.phases[i]))
    if (changedIdx >= 0) {
      const cur = current.phases[changedIdx]
      const prev = previous.phases[changedIdx]
      if (cur.price !== prev.price || cur.subtotal !== prev.subtotal)
        changes.push(`Updated ${cur.name || `Phase ${changedIdx + 1}`} pricing`)
      else if (cur.items.length !== prev.items.length)
        changes.push(`Updated ${cur.name || `Phase ${changedIdx + 1}`} line items`)
      else
        changes.push(`Edited ${cur.name || `Phase ${changedIdx + 1}`}`)
    }
  }

  // Total
  if (current.total !== previous.total)
    changes.push(`Updated total to $${current.total.toLocaleString()}`)

  // Payment
  const curTerms = current.payment?.terms ?? []
  const prevTerms = previous.payment?.terms ?? []
  if (curTerms.length !== prevTerms.length) changes.push('Updated payment terms')
  else if (JSON.stringify(curTerms) !== JSON.stringify(prevTerms)) changes.push('Edited payment terms')

  // Maintenance
  if (!previous.maintenance && current.maintenance) changes.push('Added maintenance')
  else if (previous.maintenance && !current.maintenance) changes.push('Removed maintenance')
  else if (JSON.stringify(current.maintenance) !== JSON.stringify(previous.maintenance))
    changes.push('Updated maintenance')

  // Team
  const curMembers = current.team?.members ?? []
  const prevMembers = previous.team?.members ?? []
  if (!previous.team && current.team) changes.push('Added team')
  else if (previous.team && !current.team) changes.push('Removed team')
  else if (curMembers.length > prevMembers.length) changes.push(`Added team member (${curMembers.length} total)`)
  else if (curMembers.length < prevMembers.length) changes.push(`Removed team member (${curMembers.length} total)`)
  else if (JSON.stringify(current.team) !== JSON.stringify(previous.team)) changes.push('Edited team')

  // Notes
  const curNotes = current.notes?.items ?? []
  const prevNotes = previous.notes?.items ?? []
  if (!previous.notes && current.notes) changes.push('Added notes')
  else if (previous.notes && !current.notes) changes.push('Removed notes')
  else if (curNotes.length !== prevNotes.length) changes.push(`Updated notes (${curNotes.length} items)`)
  else if (JSON.stringify(curNotes) !== JSON.stringify(prevNotes)) changes.push('Edited notes')

  // Timing note
  if (!previous.timing_note && current.timing_note) changes.push('Added timing note')
  else if (previous.timing_note && !current.timing_note) changes.push('Removed timing note')
  else if (current.timing_note !== previous.timing_note) changes.push('Edited timing note')

  if (changes.length === 0) return 'No visible changes'
  if (changes.length <= 2) return changes.join(', ')
  return `${changes[0]} + ${changes.length - 1} more`
}

interface VersionHistoryProps {
  proposalId: string
  onRestore: (content: ProposalContent) => void
}

export function VersionHistory({ proposalId, onRestore }: VersionHistoryProps) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<ProposalVersion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return

    setLoading(true)
    supabase
      .from('proposal_versions')
      .select('*')
      .eq('proposal_id', proposalId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setVersions((data as ProposalVersion[]) ?? [])
        setLoading(false)
      })
  }, [open, proposalId])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-1.5 size-3.5" />
          History
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-80 flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-sm">Version History</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="size-5 animate-spin rounded-full border-2 border-muted border-t-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">
              No versions saved yet. Versions are created automatically as you edit.
            </p>
          ) : (
            <div className="divide-y">
              {versions.map((version, i) => {
                // Compare this version to the one after it (older) to describe what changed
                const olderVersion = versions[i + 1]
                const summary = olderVersion
                  ? diffSummary(version.content, olderVersion.content)
                  : 'Initial version'

                return (
                  <div
                    key={version.id}
                    className="group flex items-center justify-between px-4 py-3"
                  >
                    <div className="mr-3 min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {i === 0 ? 'Latest save' : timeAgo(version.created_at)}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {summary}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        {new Date(version.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        {version.client_name && ` · ${version.client_name}`}
                      </p>
                    </div>
                    {i > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          onRestore(version.content)
                          setOpen(false)
                        }}
                      >
                        <RotateCcw className="mr-1 size-3" />
                        Restore
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
