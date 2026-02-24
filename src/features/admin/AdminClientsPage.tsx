import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Mail,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  UserPlus,
  Users,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { ClientInvite } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/shared/EmptyState'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { InviteClientDialog } from './components/InviteClientDialog'

interface OrgSummary {
  id: string
  name: string
  monthly_ticket_limit: number
  tickets_used: number
  created_at: string
  memberCount: number
  ticketCount: number
  modules: string[]
}

export function AdminClientsPage() {
  const [invites, setInvites] = useState<ClientInvite[]>([])
  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const [invitesRes, orgsRes] = await Promise.all([
      supabase
        .from('client_invites')
        .select('*')
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('organizations')
        .select('*')
        .order('name'),
    ])

    if (invitesRes.data) {
      setInvites(invitesRes.data as ClientInvite[])
    }

    if (orgsRes.data) {
      // Fetch member counts, ticket counts, and modules for each org
      const orgSummaries = await Promise.all(
        orgsRes.data.map(async (org) => {
          const [membersRes, ticketsRes, modulesRes] = await Promise.all([
            supabase
              .from('user_organizations')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', org.id),
            supabase
              .from('tickets')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', org.id),
            supabase
              .from('organization_modules')
              .select('module_slug')
              .eq('organization_id', org.id)
              .eq('enabled', true),
          ])

          return {
            id: org.id,
            name: org.name,
            monthly_ticket_limit: org.monthly_ticket_limit,
            tickets_used: org.tickets_used,
            created_at: org.created_at,
            memberCount: membersRes.count ?? 0,
            ticketCount: ticketsRes.count ?? 0,
            modules: (modulesRes.data ?? []).map((m) => m.module_slug),
          }
        }),
      )

      setOrgs(orgSummaries)
    }

    setLoading(false)
  }

  async function handleResendInvite(inviteId: string) {
    setActionLoading(inviteId)
    try {
      await supabase.functions.invoke('resend-invitation', {
        body: { invite_id: inviteId },
      })
    } catch {
      // Silently fail
    }
    setActionLoading(null)
  }

  async function handleDeleteInvite(inviteId: string) {
    setActionLoading(inviteId)
    try {
      await supabase.functions.invoke('delete-invite', {
        body: { invite_id: inviteId },
      })
      setInvites((prev) => prev.filter((i) => i.id !== inviteId))
    } catch {
      // Silently fail
    }
    setActionLoading(null)
  }

  const pendingInvites = invites.filter((i) => !i.accepted_at)

  return (
    <PageWrapper title="Clients" description="Manage client organizations and invitations">
      <div className="mb-6 flex items-center justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 size-4" />
          Invite Client
        </Button>
      </div>

      {/* Pending Invitations */}
      {pendingInvites.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-lg font-medium tracking-tight">Pending Invitations</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {pendingInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <Mail className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited{' '}
                        {new Date(invite.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        {' · '}
                        <Badge variant="secondary" className="text-xs">
                          {invite.role}
                        </Badge>
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={actionLoading === invite.id}>
                          {actionLoading === invite.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="size-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleResendInvite(invite.id)}>
                          <RefreshCw className="mr-2 size-4" />
                          Resend
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleDeleteInvite(invite.id)}
                        >
                          <Trash2 className="mr-2 size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Organizations */}
      <div>
        <h2 className="mb-4 text-lg font-medium tracking-tight">Organizations</h2>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
        ) : orgs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No organizations"
            description="Invite your first client to get started."
            action={
              <Button onClick={() => setInviteOpen(true)} size="sm">
                <UserPlus className="mr-2 size-4" />
                Invite Client
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {orgs.map((org) => {
              const usagePct =
                org.monthly_ticket_limit > 0
                  ? Math.round((org.tickets_used / org.monthly_ticket_limit) * 100)
                  : 0

              return (
                <Card key={org.id} className="transition-colors hover:bg-muted/30">
                  <Link to={`/admin/clients/${org.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{org.name}</CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          {org.memberCount}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Usage */}
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Monthly Usage
                          </span>
                          <span className="font-medium">
                            {org.tickets_used}/{org.monthly_ticket_limit}
                          </span>
                        </div>
                        <Progress value={usagePct} className="h-1.5" />
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{org.ticketCount} total tickets</span>
                      </div>

                      {/* Modules */}
                      {org.modules.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {org.modules.map((mod) => (
                            <Badge key={mod} variant="secondary" className="text-xs capitalize">
                              {mod}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Link>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <InviteClientDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizations={orgs.map((o) => ({ id: o.id, name: o.name }))}
        onSuccess={() => fetchData()}
      />
    </PageWrapper>
  )
}
