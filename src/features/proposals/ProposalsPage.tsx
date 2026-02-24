import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
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
import { EmptyState } from '@/components/shared'
import { timeAgo } from '@/lib/utils'
import { formatCurrency } from './lib/formatCurrency'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  draft: 'outline',
  sent: 'default',
  archived: 'secondary',
}

export function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </PageWrapper>
  )
}
