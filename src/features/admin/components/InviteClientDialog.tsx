import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { callEdgeFunction } from '@/lib/supabase'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface InviteClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: { id: string; name: string }[]
  onSuccess: () => void
}

export function InviteClientDialog({
  open,
  onOpenChange,
  organizations,
  onSuccess,
}: InviteClientDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'client' | 'admin'>('client')
  const [orgMode, setOrgMode] = useState<'existing' | 'new'>('existing')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setEmail('')
    setRole('client')
    setOrgMode('existing')
    setSelectedOrgId('')
    setNewOrgName('')
    setError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (orgMode === 'existing' && !selectedOrgId) {
      setError('Please select an organization')
      return
    }

    if (orgMode === 'new' && !newOrgName.trim()) {
      setError('Organization name is required')
      return
    }

    setLoading(true)

    try {
      const { error: fnError } = await callEdgeFunction('invite-client', {
        email: email.trim(),
        role,
        organization_id: orgMode === 'existing' ? selectedOrgId : undefined,
        new_org_name: orgMode === 'new' ? newOrgName.trim() : undefined,
      })

      if (fnError) {
        setError(fnError)
        return
      }

      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      setError(`Failed to send invitation: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Client</DialogTitle>
          <DialogDescription>
            Send an invitation to join Cambridge Studio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="client@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* Role */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as 'client' | 'admin')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Organization */}
          <div className="space-y-2">
            <Label>Organization</Label>
            <Select value={orgMode} onValueChange={(v) => setOrgMode(v as 'existing' | 'new')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="existing">Existing organization</SelectItem>
                <SelectItem value="new">Create new organization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {orgMode === 'existing' ? (
            <div className="space-y-2">
              <Label>Select Organization</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an organization..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="new-org-name">Organization Name</Label>
              <Input
                id="new-org-name"
                placeholder="Acme Corp"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
