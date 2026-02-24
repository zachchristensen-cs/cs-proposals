import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Users,
  Shield,
  Crown,
  Trash2,
  RefreshCw,
  Loader2,
  Save,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Organization, TicketStatus } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface OrgMember {
  id: string
  user_id: string
  is_owner: boolean
  joined_at: string
  user: { email: string; full_name: string | null }
  role: string | null
}

interface OrgTicket {
  id: string
  title: string
  status: TicketStatus
  created_at: string
}

interface ModuleState {
  maintenance: boolean
  projects: boolean
}

export function AdminOrgDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [org, setOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [tickets, setTickets] = useState<OrgTicket[]>([])
  const [modules, setModules] = useState<ModuleState>({ maintenance: false, projects: false })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Edit form state
  const [ticketLimit, setTicketLimit] = useState('')
  const [slaDays, setSlaDays] = useState('')
  const [billingDay, setBillingDay] = useState('')
  const [saving, setSaving] = useState(false)
  const [resettingUsage, setResettingUsage] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [ticketFilter, setTicketFilter] = useState<'all' | 'open' | 'completed'>('all')
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchOrg = useCallback(async () => {
    if (!id) return

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setOrg(data as Organization)
    setTicketLimit(String(data.monthly_ticket_limit))
    setSlaDays(String(data.sla_days))
    setBillingDay(String(data.billing_cycle_day))

    // Fetch members with roles
    const { data: membersData } = await supabase
      .from('user_organizations')
      .select('id, user_id, is_owner, joined_at, user:users(email, full_name)')
      .eq('organization_id', id)
      .order('joined_at')

    if (membersData) {
      // Fetch roles for each member
      const membersWithRoles = await Promise.all(
        membersData.map(async (m) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', m.user_id)
            .single()

          return {
            ...m,
            user: m.user as unknown as { email: string; full_name: string | null },
            role: roleData?.role ?? null,
          }
        }),
      )
      setMembers(membersWithRoles)
    }

    // Fetch modules
    const { data: modulesData } = await supabase
      .from('organization_modules')
      .select('module_slug, enabled')
      .eq('organization_id', id)

    const moduleState: ModuleState = { maintenance: false, projects: false }
    modulesData?.forEach((m) => {
      if (m.module_slug === 'maintenance') moduleState.maintenance = m.enabled
      if (m.module_slug === 'projects') moduleState.projects = m.enabled
    })
    setModules(moduleState)

    // Fetch tickets
    const { data: ticketsData } = await supabase
      .from('tickets')
      .select('id, title, status, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (ticketsData) {
      setTickets(ticketsData as OrgTicket[])
    }

    setLoading(false)
  }, [id])

  useEffect(() => {
    fetchOrg()
  }, [fetchOrg])

  async function handleToggleModule(slug: 'maintenance' | 'projects', enabled: boolean) {
    if (!id) return

    // Upsert the module record
    const { error } = await supabase
      .from('organization_modules')
      .upsert(
        { organization_id: id, module_slug: slug, enabled },
        { onConflict: 'organization_id,module_slug' },
      )

    if (!error) {
      setModules((prev) => ({ ...prev, [slug]: enabled }))
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!org) return
    setSaving(true)
    setActionMessage(null)

    const { error } = await supabase
      .from('organizations')
      .update({
        monthly_ticket_limit: parseInt(ticketLimit, 10) || 0,
        sla_days: parseInt(slaDays, 10) || 3,
        billing_cycle_day: Math.min(28, Math.max(1, parseInt(billingDay, 10) || 1)),
      })
      .eq('id', org.id)

    if (error) {
      setActionMessage({ type: 'error', text: 'Failed to save settings' })
    } else {
      setActionMessage({ type: 'success', text: 'Settings saved' })
      setOrg({
        ...org,
        monthly_ticket_limit: parseInt(ticketLimit, 10) || 0,
        sla_days: parseInt(slaDays, 10) || 3,
        billing_cycle_day: Math.min(28, Math.max(1, parseInt(billingDay, 10) || 1)),
      })
    }
    setSaving(false)
  }

  async function handleResetUsage() {
    if (!org) return
    setResettingUsage(true)

    const { error } = await supabase
      .from('organizations')
      .update({ tickets_used: 0 })
      .eq('id', org.id)

    if (!error) {
      setOrg({ ...org, tickets_used: 0 })
      setActionMessage({ type: 'success', text: 'Usage reset to 0' })
    }
    setResettingUsage(false)
  }

  async function handleToggleOwner(memberId: string, userId: string, makeOwner: boolean) {
    await supabase
      .from('user_organizations')
      .update({ is_owner: makeOwner })
      .eq('id', memberId)

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, is_owner: makeOwner } : m)),
    )
    // suppress unused variable warning
    void userId
  }

  async function handleRemoveMember(memberId: string) {
    await supabase.from('user_organizations').delete().eq('id', memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  async function handleDeleteOrg() {
    if (!org) return
    setDeleting(true)

    const { error } = await supabase.from('organizations').delete().eq('id', org.id)

    if (!error) {
      navigate('/admin/clients')
    } else {
      setActionMessage({ type: 'error', text: 'Failed to delete organization' })
      setDeleting(false)
    }
  }

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === 'open') return t.status !== 'completed'
    if (ticketFilter === 'completed') return t.status === 'completed'
    return true
  })

  if (loading) {
    return (
      <PageWrapper title="Loading...">
        <div className="py-8 text-center text-sm text-muted-foreground">Loading organization...</div>
      </PageWrapper>
    )
  }

  if (notFound || !org) {
    return (
      <PageWrapper title="Not Found">
        <div className="py-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">Organization not found.</p>
          <Button variant="outline" asChild>
            <Link to="/admin/clients">Back to Clients</Link>
          </Button>
        </div>
      </PageWrapper>
    )
  }

  const usagePct =
    org.monthly_ticket_limit > 0
      ? Math.round((org.tickets_used / org.monthly_ticket_limit) * 100)
      : 0

  return (
    <PageWrapper title={org.name}>
      <Button variant="ghost" size="sm" asChild className="-ml-2 mb-4">
        <Link to="/admin/clients">
          <ArrowLeft className="mr-1 size-4" />
          Back to Clients
        </Link>
      </Button>

      {actionMessage && (
        <div
          className={`mb-4 rounded-md border p-3 text-sm ${
            actionMessage.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {actionMessage.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Members + Modules */}
        <div className="space-y-6 lg:col-span-2">
          {/* Team Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground">No members yet.</p>
              ) : (
                <div className="divide-y">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">
                            {member.user.full_name ?? member.user.email}
                          </p>
                          {member.is_owner && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <Crown className="size-3" /> Owner
                            </Badge>
                          )}
                          {member.role && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Shield className="size-3" /> {member.role}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{member.user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined{' '}
                          {new Date(member.joined_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleOwner(member.id, member.user_id, !member.is_owner)}
                          title={member.is_owner ? 'Remove owner' : 'Make owner'}
                        >
                          <Crown className={`size-4 ${member.is_owner ? 'text-amber-500' : 'text-muted-foreground'}`} />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="size-4 text-muted-foreground" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remove member?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Remove {member.user.email} from {org.name}? They will lose access to this organization.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemoveMember(member.id)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Modules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Maintenance</p>
                  <p className="text-xs text-muted-foreground">Ticket-based website maintenance</p>
                </div>
                <Switch
                  checked={modules.maintenance}
                  onCheckedChange={(v) => handleToggleModule('maintenance', v)}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Projects</p>
                  <p className="text-xs text-muted-foreground">Full project management workflow</p>
                </div>
                <Switch
                  checked={modules.projects}
                  onCheckedChange={(v) => handleToggleModule('projects', v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tickets</CardTitle>
                <div className="flex gap-1">
                  {(['all', 'open', 'completed'] as const).map((f) => (
                    <Button
                      key={f}
                      variant={ticketFilter === f ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setTicketFilter(f)}
                      className="text-xs capitalize"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tickets.</p>
              ) : (
                <div className="divide-y">
                  {filteredTickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to={`/admin/maintenance/${ticket.id}`}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{ticket.title}</p>
                      </div>
                      <StatusBadge status={ticket.status} />
                      <span className="text-xs text-muted-foreground">
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

        {/* Right column: Usage, Settings, Danger Zone */}
        <div className="space-y-6">
          {/* Usage & SLA */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usage & SLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Monthly Tickets</span>
                  <span className="font-medium">
                    {org.tickets_used}/{org.monthly_ticket_limit}
                  </span>
                </div>
                <Progress value={usagePct} className="h-2" />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">SLA</span>
                <span>{org.sla_days} business days</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Billing Cycle Reset</span>
                <span>Day {org.billing_cycle_day}</span>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full" disabled={resettingUsage}>
                    {resettingUsage ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 size-4" />
                    )}
                    Reset Usage
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset ticket usage?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reset the tickets used counter to 0 for {org.name}.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleResetUsage}>Reset</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Edit Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ticket-limit">Monthly Ticket Limit</Label>
                  <Input
                    id="ticket-limit"
                    type="number"
                    min="0"
                    value={ticketLimit}
                    onChange={(e) => setTicketLimit(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sla-days">SLA Days</Label>
                  <Input
                    id="sla-days"
                    type="number"
                    min="1"
                    value={slaDays}
                    onChange={(e) => setSlaDays(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billing-day">Billing Cycle Day (1–28)</Label>
                  <Input
                    id="billing-day"
                    type="number"
                    min="1"
                    max="28"
                    value={billingDay}
                    onChange={(e) => setBillingDay(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 size-4" />
                  )}
                  Save Settings
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <AlertTriangle className="size-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-muted-foreground">
                Deleting this organization will permanently remove all associated data including members, tickets, and files.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full" disabled={deleting}>
                    {deleting ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 size-4" />
                    )}
                    Delete Organization
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete &quot;{org.name}&quot;?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. All members, tickets, files, and data associated with this organization will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOrg}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  )
}
