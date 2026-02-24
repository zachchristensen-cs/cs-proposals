import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import type { Ticket } from '@/types/database'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/shared/StatusBadge'

interface MaintenanceSidebarProps {
  refreshKey: number
}

interface OrgMember {
  user_id: string
  is_owner: boolean
  users: { email: string; full_name: string | null } | null
}

export function MaintenanceSidebar({ refreshKey }: MaintenanceSidebarProps) {
  const { user } = useAuth()
  const { activeOrg } = useOrg()
  const [recentTickets, setRecentTickets] = useState<Ticket[]>([])
  const [members, setMembers] = useState<OrgMember[]>([])

  useEffect(() => {
    if (!activeOrg || !user) return

    supabase
      .from('tickets')
      .select('*')
      .eq('organization_id', activeOrg.id)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentTickets((data as Ticket[]) ?? []))

    supabase
      .from('user_organizations')
      .select('user_id, is_owner, users(email, full_name)')
      .eq('organization_id', activeOrg.id)
      .then(({ data }) => setMembers((data as unknown as OrgMember[]) ?? []))
  }, [activeOrg, user, refreshKey])

  if (!activeOrg) return null

  const usagePercent =
    activeOrg.monthly_ticket_limit > 0
      ? Math.round(
          (activeOrg.tickets_used / activeOrg.monthly_ticket_limit) * 100,
        )
      : 0

  return (
    <div className="space-y-4">
      {/* Company Card */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-sm font-medium">Organization</h3>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{activeOrg.name}</p>
        </CardContent>
      </Card>

      {/* Usage Stats */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-sm font-medium">Ticket Usage</h3>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-medium">{activeOrg.tickets_used}</span>
            <span className="text-sm text-muted-foreground">
              / {activeOrg.monthly_ticket_limit}
            </span>
          </div>
          <Progress value={usagePercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Resets on the {ordinal(activeOrg.billing_cycle_day)} of each month
          </p>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-sm font-medium">Team Members</h3>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  {m.users?.full_name || m.users?.email || 'Unknown'}
                </span>
                {m.is_owner && (
                  <span className="ml-2 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    Owner
                  </span>
                )}
              </li>
            ))}
            {members.length === 0 && (
              <li className="text-sm text-muted-foreground">No members</li>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Recent Tickets */}
      <Card>
        <CardHeader className="pb-2">
          <h3 className="text-sm font-medium">Recent Tickets</h3>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tickets yet</p>
          ) : (
            <ul className="space-y-3">
              {recentTickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    to={`/dashboard/maintenance/${ticket.id}`}
                    className="group block"
                  >
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {ticket.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
