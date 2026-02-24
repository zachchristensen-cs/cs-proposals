import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<'loading' | 'accepting' | 'error' | 'success'>('loading')
  const [error, setError] = useState<string | null>(null)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('No invite token provided')
      setStatus('error')
      return
    }

    if (authLoading) return

    async function processInvite() {
      // Look up the invite
      const { data: invite, error: fetchError } = await supabase
        .from('client_invites')
        .select('*')
        .eq('token', token!)
        .single()

      if (fetchError || !invite) {
        setError('Invalid or expired invite link')
        setStatus('error')
        return
      }

      if (invite.accepted_at) {
        setError('This invite has already been accepted')
        setStatus('error')
        return
      }

      if (!user) {
        // Not authenticated – redirect to reset-password flow.
        // Supabase will have sent the invite email with a magic link
        // that sets up the auth user. Redirect them to set their password.
        navigate(`/reset-password`, { replace: true })
        return
      }

      // User is authenticated – accept the invite
      setStatus('accepting')

      const { error: insertError } = await supabase
        .from('user_organizations')
        .insert({
          user_id: user.id,
          organization_id: invite.organization_id,
        })

      if (insertError) {
        // Unique constraint means they're already in the org
        if (insertError.code === '23505') {
          // Already a member, just mark the invite accepted
        } else {
          setError('Failed to join organization. Please try again.')
          setStatus('error')
          return
        }
      }

      // Mark invite as accepted
      await supabase
        .from('client_invites')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invite.id)

      setStatus('success')
    }

    processInvite()
  }, [token, user, authLoading, navigate])

  if (status === 'loading' || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Verifying invite...</div>
      </div>
    )
  }

  if (status === 'accepting') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Joining organization...</div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <h1 className="font-serif text-2xl tracking-tight">Cambridge Studio</h1>
            <p className="text-sm text-muted-foreground">Invite Error</p>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Go to login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // success
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <h1 className="font-serif text-2xl tracking-tight">Cambridge Studio</h1>
          <p className="text-sm text-muted-foreground">Invite Accepted</p>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            You've been added to the organization.
          </p>
          <Button onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  )
}
