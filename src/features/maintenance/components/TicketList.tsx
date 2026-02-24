import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Search, Inbox } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/contexts/OrgContext'
import type { Ticket } from '@/types/database'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Processing', value: 'processing' },
  { label: 'In Dev', value: 'in_dev' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
] as const

const PAGE_SIZE = 20

export function TicketList() {
  const { activeOrg } = useOrg()
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    if (!activeOrg) return

    setLoading(true)

    let query = supabase
      .from('tickets')
      .select('*', { count: 'exact' })
      .eq('organization_id', activeOrg.id)
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (search.trim()) {
      query = query.or(
        `title.ilike.%${search.trim()}%,raw_message.ilike.%${search.trim()}%`,
      )
    }

    query.then(({ data, count }) => {
      setTickets((data as Ticket[]) ?? [])
      setTotalCount(count ?? 0)
      setLoading(false)
    })
  }, [activeOrg, page, statusFilter, search])

  const totalPages = useMemo(
    () => Math.ceil(totalCount / PAGE_SIZE),
    [totalCount],
  )

  // Reset to page 0 when filters change
  useEffect(() => {
    setPage(0)
  }, [statusFilter, search])

  if (!loading && tickets.length === 0 && !search && statusFilter === 'all') {
    return (
      <EmptyState
        icon={Inbox}
        title="No tickets yet"
        description="Submit your first maintenance request to get started."
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets..."
          className="pl-9"
        />
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={statusFilter === f.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(f.value)}
            className="h-7 text-xs"
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Ticket rows */}
      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : tickets.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No tickets match your filters.
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              to={`/dashboard/maintenance/${ticket.id}`}
              className="block rounded-lg border p-4 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium">{ticket.title}</h4>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {ticket.raw_message}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {new Date(ticket.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
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
    </div>
  )
}
