import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Search, Wrench } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { TicketStatus } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AdminTicket {
  id: string
  title: string
  status: TicketStatus
  created_at: string
  organization: { name: string } | null
  user: { email: string } | null
}

const STATUS_FILTERS: { label: string; value: TicketStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Processing', value: 'processing' },
  { label: 'In Dev', value: 'in_dev' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
]

const PAGE_SIZE = 25

export function AdminMaintenancePage() {
  const [tickets, setTickets] = useState<AdminTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  const fetchTickets = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('tickets')
      .select(
        'id, title, status, created_at, organization:organizations(name), user:users(email)',
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (search.trim()) {
      query = query.or(`title.ilike.%${search.trim()}%,raw_message.ilike.%${search.trim()}%`)
    }

    const { data, count } = await query

    if (data) {
      setTickets(
        data.map((t) => ({
          ...t,
          status: t.status as TicketStatus,
          organization: t.organization as unknown as { name: string } | null,
          user: t.user as unknown as { email: string } | null,
        })),
      )
    }
    setTotalCount(count ?? 0)
    setLoading(false)
  }, [page, statusFilter, search])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    setPage(0)
  }, [search, statusFilter])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <PageWrapper title="Maintenance" description="Manage all maintenance tickets">
      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tickets by title or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No tickets found"
              description={
                search || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters.'
                  : 'No tickets have been submitted yet.'
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Submitter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id} className="cursor-pointer">
                    <TableCell className="max-w-[300px] font-medium">
                      <Link to={`/admin/maintenance/${ticket.id}`} className="hover:underline">
                        {ticket.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.organization?.name ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.user?.email ?? '—'}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ticket.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of{' '}
            {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
