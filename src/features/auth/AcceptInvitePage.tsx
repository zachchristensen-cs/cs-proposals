import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase, callEdgeFunction } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

type PageStatus = 'loading' | 'needs_signup' | 'accepting' | 'error' | 'success'

interface InviteInfo {
  email: string
}

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<PageStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const token = searchParams.get('token')

  // Step 1: Validate the token via edge function (no auth required)
  useEffect(() => {
    if (!token) {
      setError('No invite token provided')
      setStatus('error')
      return
    }

    if (authLoading) return

    async function validateToken() {
      const { data, error: fnError } = await callEdgeFunction<{
        email: string
      }>('validate-invite', { token: token! }, { requireAuth: false })

      if (fnError || !data) {
        setError(fnError ?? 'Invalid or expired invite link')
        setStatus('error')
        return
      }

      setInviteInfo({ email: data.email })

      if (user) {
        // Already logged in — accept the invite directly
        await acceptInviteWithFreshToken()
      } else {
        // Need to create account
        setStatus('needs_signup')
      }
    }

    validateToken()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, authLoading])

  async function acceptInviteWithFreshToken() {
    setStatus('accepting')

    const { error: fnError } = await callEdgeFunction('accept-invite', { token: token! })

    if (fnError) {
      setError(fnError)
      setStatus('error')
      return
    }

    setStatus('success')
  }

  async function acceptInviteWithToken(accessToken: string) {
    setStatus('accepting')

    const { error: fnError } = await callEdgeFunction('accept-invite', { token: token! })

    // If callEdgeFunction failed because session was stale, try with the explicit token
    if (fnError) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invite`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ token }),
          },
        )

        const resData = await res.json()

        if (!res.ok || resData?.error) {
          setError(resData?.error ?? 'Failed to accept invite')
          setStatus('error')
          return
        }
      } catch {
        setError(fnError)
        setStatus('error')
        return
      }
    }

    setStatus('success')
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteInfo) return

    setSubmitting(true)
    setError(null)

    try {
      // Try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: inviteInfo.email,
        password,
        options: {
          data: { full_name: fullName.trim() || undefined },
        },
      })

      if (signUpError) {
        // If user already exists, try signing in instead
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: inviteInfo.email,
            password,
          })

          if (signInError) {
            setError('Account already exists. Please check your password or go to login.')
            setSubmitting(false)
            return
          }

          await acceptInviteWithToken(signInData.session?.access_token ?? '')
          setSubmitting(false)
          return
        }

        setError(signUpError.message)
        setSubmitting(false)
        return
      }

      // If signUp returned a session, use it
      if (signUpData.session) {
        await acceptInviteWithToken(signUpData.session.access_token)
        setSubmitting(false)
        return
      }

      // No session from signUp — user may have been pre-created by inviteUserByEmail
      // Try signing in with the password they just chose
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: inviteInfo.email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        setSubmitting(false)
        return
      }

      await acceptInviteWithToken(signInData.session?.access_token ?? '')
      setSubmitting(false)
    } catch (err) {
      setError(`Something went wrong: ${err}`)
      setSubmitting(false)
    }
  }

  // ─── Render States ───────────────────────────────────────

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
        <div className="text-muted-foreground">Setting up your account...</div>
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

  if (status === 'needs_signup') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <h1 className="font-serif text-2xl tracking-tight">Cambridge Studio</h1>
            <p className="text-sm text-muted-foreground">
              Set up your account to get started
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteInfo?.email ?? ''}
                  disabled
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-name">Full Name</Label>
                <Input
                  id="invite-name"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-password">Password</Label>
                <Input
                  id="invite-password"
                  type="password"
                  placeholder="Choose a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  minLength={6}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Create Account & Join
              </Button>
            </form>
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
          <p className="text-sm text-muted-foreground">You're in!</p>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Your account is ready.
          </p>
          <Button onClick={() => { window.location.href = '/admin' }}>Go to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  )
}
