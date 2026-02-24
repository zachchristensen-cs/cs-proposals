import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Proposal } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState } from '@/components/shared'
import { timeAgo } from '@/lib/utils'
import { formatCurrency } from './lib/formatCurrency'
import { toast } from 'sonner'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  sent: 'default',
  archived: 'secondary',
}

export function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('proposals')
        .select('*')
        .order('updated_at', { ascending: false })

      setProposals((data as Proposal[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete() {
    if (!deleteTarget) return

    const { error } = await supabase
      .from('proposals')
      .delete()
      .eq('id', deleteTarget.id)

    if (error) {
      toast.error('Failed to delete proposal')
    } else {
      setProposals((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      toast.success('Proposal deleted')
    }
    setDeleteTarget(null)
  }

  return (
    <PageWrapper
      title="Proposals"
      description="Create and manage client proposals"
      action={
        <Button asChild>
          <Link to="/admin/proposals/new">
            <Plus className="mr-2 size-4" />
            New Proposal
          </Link>
        </Button>
      }
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No proposals yet"
          description="Create your first proposal to get started."
          action={
            <Button asChild>
              <Link to="/admin/proposals/new">
                <Plus className="mr-2 size-4" />
                New Proposal
              </Link>
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Updated</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {proposals.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell>
                  <Link
                    to={`/admin/proposals/${p.id}`}
                    className="font-medium hover:underline"
                  >
                    {p.client_name || 'Untitled'}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[p.status] ?? 'outline'} className="capitalize">
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {p.tier ? `Tier ${p.tier}` : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {p.content?.total ? formatCurrency(p.content.total) : '—'}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {timeAgo(p.updated_at)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(p)
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete proposal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the proposal for{' '}
              <span className="font-medium text-foreground">
                {deleteTarget?.client_name || 'Untitled'}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  )
}
