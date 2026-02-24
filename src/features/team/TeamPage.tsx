import { useEffect, useState } from 'react'
import { Users, RotateCw, Trash2, Clock, Mail } from 'lucide-react'
import { supabase, callEdgeFunction } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared'
import { InviteDialog } from './InviteDialog'
import { toast } from 'sonner'
import { timeAgo } from '@/lib/utils'

interface StaffMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

interface PendingInvite {
  id: string
  email: string
  role: string
  created_at: string
}

export function TeamPage() {
  const [members, setMembers] = useState<StaffMember[]>([])
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    const [{ data: staffData }, { data: inviteData }] = await Promise.all([
      supabase.rpc('get_agency_staff'),
      supabase
        .from('client_invites')
        .select('id, email, role, created_at')
        .is('accepted_at', null)
        .in('role', ['admin', 'member'])
        .order('created_at', { ascending: false }),
    ])

    setMembers((staffData as StaffMember[]) ?? [])
    setInvites((inviteData as PendingInvite[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function handleResend(invite: PendingInvite) {
    const { error } = await callEdgeFunction('resend-invitation', {
      invite_id: invite.id,
    })
    if (error) {
      toast.error(error)
    } else {
      toast.success(`Invite resent to ${invite.email}`)
    }
  }

  async function handleDelete(invite: PendingInvite) {
    const { error } = await callEdgeFunction('delete-invite', {
      invite_id: invite.id,
    })
    if (error) {
      toast.error(error)
    } else {
      setInvites((prev) => prev.filter((i) => i.id !== invite.id))
      toast.success('Invite cancelled')
    }
  }

  return (
    <PageWrapper
      title="Team"
      description="Manage your team members and invitations"
      action={<InviteDialog onInviteSent={loadData} />}
    >
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : members.length === 0 && invites.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No team members yet"
          description="Invite your first team member to get started."
        />
      ) : (
        <div className="space-y-8">
          {/* Current members */}
          {members.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                Members ({members.length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">
                        {m.full_name || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {m.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                          {m.role}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pending invites */}
          {invites.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="size-3.5" />
                Pending Invites ({invites.length})
              </h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        {inv.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {inv.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {timeAgo(inv.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResend(inv)}
                          >
                            <RotateCw className="mr-1.5 size-3.5" />
                            Resend
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(inv)}
                          >
                            <Trash2 className="mr-1.5 size-3.5" />
                            Cancel
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  )
}
