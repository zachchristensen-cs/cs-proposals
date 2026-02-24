import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Ticket,
  CalendarDays,
  CheckCircle2,
  Plus,
  UserPlus,
  Wrench,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { TicketStatus } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface DashboardStats {
  totalClients: number
  totalTickets: number
  monthTickets: number
  completedTickets: number
  prevMonthTickets: number
  prevCompletedTickets: number
}

interface RecentTicket {
  id: string
  title: string
  status: TicketStatus
  created_at: string
  organization: { name: string } | null
  user: { email: string; full_name: string | null } | null
}

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null
  if (previous === 0) return <span className="flex items-center text-xs text-green-600"><TrendingUp className="mr-0.5 size-3" />New</span>
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return <span className="flex items-center text-xs text-muted-foreground"><Minus className="mr-0.5 size-3" />0%</span>
  if (pct > 0) return <span className="flex items-center text-xs text-green-600"><TrendingUp className="mr-0.5 size-3" />+{pct}%</span>
  return <span className="flex items-center text-xs text-red-600"><TrendingDown className="mr-0.5 size-3" />{pct}%</span>
}

export function AdminPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalTickets: 0,
    monthTickets: 0,
    completedTickets: 0,
    prevMonthTickets: 0,
    prevCompletedTickets: 0,
  })
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

      const [orgsRes, ticketsRes, monthRes, completedRes, prevMonthRes, prevCompletedRes, recentRes] =
        await Promise.all([
          supabase.from('organizations').select('id', { count: 'exact', head: true }),
          supabase.from('tickets').select('id', { count: 'exact', head: true }),
          supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfMonth),
          supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'completed'),
          supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', startOfPrevMonth)
            .lt('created_at', startOfMonth),
          supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'completed')
            .lt('completed_at', startOfMonth),
          supabase
            .from('tickets')
            .select('id, title, status, created_at, organization:organizations(name), user:users(email, full_name)')
            .order('created_at', { ascending: false })
            .limit(10),
        ])

      setStats({
        totalClients: orgsRes.count ?? 0,
        totalTickets: ticketsRes.count ?? 0,
        monthTickets: monthRes.count ?? 0,
        completedTickets: completedRes.count ?? 0,
        prevMonthTickets: prevMonthRes.count ?? 0,
        prevCompletedTickets: prevCompletedRes.count ?? 0,
      })

      if (recentRes.data) {
        setRecentTickets(
          recentRes.data.map((t) => ({
            ...t,
            status: t.status as TicketStatus,
            organization: t.organization as unknown as { name: string } | null,
            user: t.user as unknown as { email: string; full_name: string | null } | null,
          })),
        )
      }

      setLoading(false)
    }

    fetchDashboard()
  }, [])

  const statCards = [
    {
      label: 'Total Clients',
      value: stats.totalClients,
      icon: Building2,
      trend: null as { current: number; previous: number } | null,
    },
    {
      label: 'Total Tickets',
      value: stats.totalTickets,
      icon: Ticket,
      trend: null,
    },
    {
      label: "This Month's Tickets",
      value: stats.monthTickets,
      icon: CalendarDays,
      trend: { current: stats.monthTickets, previous: stats.prevMonthTickets },
    },
    {
      label: 'Completed Tickets',
      value: stats.completedTickets,
      icon: CheckCircle2,
      trend: { current: stats.completedTickets, previous: stats.prevCompletedTickets },
    },
  ]

  return (
    <PageWrapper title="Admin Dashboard">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">
                  {loading ? '—' : card.value}
                </span>
                {card.trend && !loading && (
                  <TrendIndicator current={card.trend.current} previous={card.trend.previous} />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-medium tracking-tight">Recent Activity</h2>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
              ) : recentTickets.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No tickets yet.
                </div>
              ) : (
                <div className="divide-y">
                  {recentTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to={`/admin/maintenance/${ticket.id}`}
                      className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{ticket.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ticket.organization?.name ?? 'Unknown org'} · {ticket.user?.email ?? 'Unknown'}
                        </p>
                      </div>
                      <StatusBadge status={ticket.status} />
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-lg font-medium tracking-tight">Quick Actions</h2>
          <div className="grid gap-3">
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/maintenance">
                <Wrench className="mr-2 size-4" />
                Manage Tickets
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/clients">
                <UserPlus className="mr-2 size-4" />
                Invite Client
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/clients">
                <Plus className="mr-2 size-4" />
                Create Ticket
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link to="/admin/settings">
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
