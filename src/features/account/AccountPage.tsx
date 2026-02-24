import { useState } from 'react'
import { Loader2, User, Mail, Lock, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export function AccountPage() {
  const { user, role } = useAuth()

  // Name change
  const [fullName, setFullName] = useState(
    () => (user?.user_metadata?.full_name as string) ?? '',
  )
  const [nameLoading, setNameLoading] = useState(false)
  const [nameMessage, setNameMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Email change
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailMessage, setEmailMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  const displayName =
    (user?.user_metadata?.full_name as string) || user?.email || '?'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleNameChange(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setNameLoading(true)
    setNameMessage(null)

    try {
      // Update auth metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      })

      if (authError) {
        setNameMessage({ type: 'error', text: authError.message })
        setNameLoading(false)
        return
      }

      // Update users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ full_name: fullName.trim() })
        .eq('id', user!.id)

      if (dbError) {
        setNameMessage({ type: 'error', text: dbError.message })
      } else {
        setNameMessage({ type: 'success', text: 'Name updated successfully' })
      }
    } catch (err) {
      setNameMessage({ type: 'error', text: `Something went wrong: ${err}` })
    }

    setNameLoading(false)
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail.trim()) return
    setEmailLoading(true)
    setEmailMessage(null)

    const { error } = await supabase.auth.updateUser({
      email: newEmail.trim(),
    })

    if (error) {
      setEmailMessage({ type: 'error', text: error.message })
    } else {
      setEmailMessage({
        type: 'success',
        text: 'Confirmation email sent. Please check both your old and new email addresses.',
      })
      setNewEmail('')
    }
    setEmailLoading(false)
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPasswordMessage(null)

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: 'error',
        text: 'Password must be at least 8 characters',
      })
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    setPasswordLoading(true)

    // Verify current password by re-signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    })

    if (signInError) {
      setPasswordMessage({
        type: 'error',
        text: 'Current password is incorrect',
      })
      setPasswordLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPasswordMessage({ type: 'error', text: error.message })
    } else {
      setPasswordMessage({
        type: 'success',
        text: 'Password updated successfully',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setPasswordLoading(false)
  }

  return (
    <PageWrapper title="Account" description="Manage your account settings">
      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-base font-medium tracking-wide">
          {initials}
        </div>
        <div>
          <p className="text-base font-medium">{displayName}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <Badge variant="secondary" className="mt-1.5 capitalize">
            {role}
          </Badge>
        </div>
      </div>

      <Separator className="my-8" />

      {/* Update Name */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <User className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Update Name
          </h3>
        </div>
        <form onSubmit={handleNameChange} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full-name">Full Name</Label>
            <Input
              id="full-name"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={nameLoading}
            />
          </div>

          {nameMessage && (
            <p
              className={`flex items-center gap-1.5 text-sm ${
                nameMessage.type === 'success'
                  ? 'text-green-600'
                  : 'text-destructive'
              }`}
            >
              {nameMessage.type === 'success' && (
                <Check className="size-3.5" />
              )}
              {nameMessage.text}
            </p>
          )}

          <Button type="submit" disabled={nameLoading || !fullName.trim()}>
            {nameLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Name
          </Button>
        </form>
      </section>

      <Separator className="my-8" />

      {/* Update Email */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Update Email
          </h3>
        </div>
        <form onSubmit={handleEmailChange} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-email">Current Email</Label>
            <Input id="current-email" value={user?.email ?? ''} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-email">New Email</Label>
            <Input
              id="new-email"
              type="email"
              placeholder="new@email.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              disabled={emailLoading}
            />
          </div>

          {emailMessage && (
            <p
              className={`flex items-center gap-1.5 text-sm ${
                emailMessage.type === 'success'
                  ? 'text-green-600'
                  : 'text-destructive'
              }`}
            >
              {emailMessage.type === 'success' && (
                <Check className="size-3.5" />
              )}
              {emailMessage.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={emailLoading || !newEmail.trim()}
          >
            {emailLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Update Email
          </Button>
        </form>
      </section>

      <Separator className="my-8" />

      {/* Update Password */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            Update Password
          </h3>
        </div>
        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={passwordLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={passwordLoading}
              placeholder="Minimum 8 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={passwordLoading}
            />
          </div>

          {passwordMessage && (
            <p
              className={`flex items-center gap-1.5 text-sm ${
                passwordMessage.type === 'success'
                  ? 'text-green-600'
                  : 'text-destructive'
              }`}
            >
              {passwordMessage.type === 'success' && (
                <Check className="size-3.5" />
              )}
              {passwordMessage.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={
              passwordLoading ||
              !currentPassword ||
              !newPassword ||
              !confirmPassword
            }
          >
            {passwordLoading && (
              <Loader2 className="mr-2 size-4 animate-spin" />
            )}
            Update Password
          </Button>
        </form>
      </section>
    </PageWrapper>
  )
}
