import { useEffect, useState } from 'react'
import {
  Save,
  Loader2,
  Plus,
  X,
  Zap,
  Mail,
  MessageSquare,
  Settings,
  Users,
  UserPlus,
  Shield,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AdminSettings } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { InviteClientDialog } from './components/InviteClientDialog'

export function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingNotion, setTestingNotion] = useState(false)
  const [testingSlack, setTestingSlack] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)

  // Form state
  const [notionDbId, setNotionDbId] = useState('')
  const [notionApiKey, setNotionApiKey] = useState('')
  const [notionAutoSync, setNotionAutoSync] = useState(false)
  const [adminEmails, setAdminEmails] = useState<string[]>([])
  const [clientEmailsEnabled, setClientEmailsEnabled] = useState(true)
  const [adminEmailsEnabled, setAdminEmailsEnabled] = useState(true)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')
  const [defaultTicketLimit, setDefaultTicketLimit] = useState('')
  const [defaultSlaDays, setDefaultSlaDays] = useState('')
  const [defaultBillingDay, setDefaultBillingDay] = useState('')
  const [appUrl, setAppUrl] = useState('')
  const [agencyName, setAgencyName] = useState('')

  // Admin users
  const [adminUsers, setAdminUsers] = useState<{ id: string; email: string }[]>([])

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from('admin_settings')
        .select('*')
        .limit(1)
        .single()

      if (data) {
        const s = data as AdminSettings
        setSettings(s)
        setNotionDbId(s.notion_database_id ?? '')
        setNotionApiKey(s.notion_api_key ?? '')
        setNotionAutoSync(s.notion_auto_sync)
        setAdminEmails(s.admin_notification_emails ?? [])
        setClientEmailsEnabled(s.client_emails_enabled)
        setAdminEmailsEnabled(s.admin_emails_enabled)
        setSlackWebhookUrl(s.slack_webhook_url ?? '')
        setDefaultTicketLimit(String(s.default_monthly_ticket_limit))
        setDefaultSlaDays(String(s.default_sla_days))
        setDefaultBillingDay(String(s.default_billing_cycle_day))
        setAppUrl(s.app_url)
        setAgencyName(s.agency_name)
      }

      // Fetch admin users
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')

      if (adminRoles) {
        const userIds = adminRoles.map((r) => r.user_id)
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, email')
            .in('id', userIds)

          if (users) {
            setAdminUsers(users as { id: string; email: string }[])
          }
        }
      }

      setLoading(false)
    }

    fetchSettings()
  }, [])

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('admin_settings')
      .update({
        notion_database_id: notionDbId || null,
        notion_api_key: notionApiKey || null,
        notion_auto_sync: notionAutoSync,
        admin_notification_emails: adminEmails,
        client_emails_enabled: clientEmailsEnabled,
        admin_emails_enabled: adminEmailsEnabled,
        slack_webhook_url: slackWebhookUrl || null,
        default_monthly_ticket_limit: parseInt(defaultTicketLimit, 10) || 10,
        default_sla_days: parseInt(defaultSlaDays, 10) || 3,
        default_billing_cycle_day: Math.min(28, Math.max(1, parseInt(defaultBillingDay, 10) || 1)),
        app_url: appUrl,
        agency_name: agencyName,
      })
      .eq('id', settings.id)

    if (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' })
    } else {
      setMessage({ type: 'success', text: 'Settings saved successfully' })
    }
    setSaving(false)
  }

  async function handleTestNotion() {
    setTestingNotion(true)
    setMessage(null)
    try {
      const { data, error } = await supabase.functions.invoke('test-notion-connection', {
        body: {},
      })
      if (error) throw error
      if (data?.success) {
        setMessage({ type: 'success', text: 'Notion connection successful!' })
      } else {
        setMessage({ type: 'error', text: data?.error ?? 'Notion connection failed' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Notion test failed: ${err}` })
    }
    setTestingNotion(false)
  }

  async function handleTestSlack() {
    setTestingSlack(true)
    setMessage(null)
    try {
      const { error } = await supabase.functions.invoke('send-slack-notification', {
        body: { text: 'Test notification from Cambridge Studio' },
      })
      if (error) throw error
      setMessage({ type: 'success', text: 'Slack test message sent!' })
    } catch (err) {
      setMessage({ type: 'error', text: `Slack test failed: ${err}` })
    }
    setTestingSlack(false)
  }

  function addAdminEmail() {
    if (!newAdminEmail.trim() || adminEmails.includes(newAdminEmail.trim())) return
    setAdminEmails([...adminEmails, newAdminEmail.trim()])
    setNewAdminEmail('')
  }

  function removeAdminEmail(email: string) {
    setAdminEmails(adminEmails.filter((e) => e !== email))
  }

  if (loading) {
    return (
      <PageWrapper title="Settings">
        <div className="py-8 text-center text-sm text-muted-foreground">Loading settings...</div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Settings" description="Configure application settings">
      {message && (
        <div
          className={`mb-6 rounded-md border p-3 text-sm ${
            message.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {/* Notion Integration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4" />
              Notion Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notion-db-id">Notion Database ID</Label>
              <Input
                id="notion-db-id"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={notionDbId}
                onChange={(e) => setNotionDbId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notion-api-key">Notion API Key</Label>
              <Input
                id="notion-api-key"
                type="password"
                placeholder="secret_..."
                value={notionApiKey}
                onChange={(e) => setNotionApiKey(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-sync</p>
                <p className="text-xs text-muted-foreground">Automatically sync new tickets to Notion</p>
              </div>
              <Switch checked={notionAutoSync} onCheckedChange={setNotionAutoSync} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotion}
              disabled={testingNotion || !notionDbId || !notionApiKey}
            >
              {testingNotion && <Loader2 className="mr-2 size-4 animate-spin" />}
              Test Connection
            </Button>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="size-4" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="mb-2 block">Admin Notification Emails</Label>
              <div className="mb-2 flex flex-wrap gap-2">
                {adminEmails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button onClick={() => removeAdminEmail(email)} className="ml-1">
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="admin@agency.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addAdminEmail()
                    }
                  }}
                  className="max-w-xs"
                />
                <Button variant="outline" size="sm" onClick={addAdminEmail}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Client Notifications</p>
                <p className="text-xs text-muted-foreground">Send emails to clients on ticket updates</p>
              </div>
              <Switch checked={clientEmailsEnabled} onCheckedChange={setClientEmailsEnabled} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Admin Notifications</p>
                <p className="text-xs text-muted-foreground">Send emails to admins on new tickets</p>
              </div>
              <Switch checked={adminEmailsEnabled} onCheckedChange={setAdminEmailsEnabled} />
            </div>
          </CardContent>
        </Card>

        {/* Slack */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" />
              Slack
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slack-webhook">Webhook URL</Label>
              <Input
                id="slack-webhook"
                type="url"
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSlack}
              disabled={testingSlack || !slackWebhookUrl}
            >
              {testingSlack && <Loader2 className="mr-2 size-4 animate-spin" />}
              Send Test Message
            </Button>
          </CardContent>
        </Card>

        {/* Defaults */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Settings className="size-4" />
              Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="def-ticket-limit">Monthly Ticket Limit</Label>
                <Input
                  id="def-ticket-limit"
                  type="number"
                  min="1"
                  value={defaultTicketLimit}
                  onChange={(e) => setDefaultTicketLimit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="def-sla">SLA Days</Label>
                <Input
                  id="def-sla"
                  type="number"
                  min="1"
                  value={defaultSlaDays}
                  onChange={(e) => setDefaultSlaDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="def-billing">Billing Cycle Day</Label>
                <Input
                  id="def-billing"
                  type="number"
                  min="1"
                  max="28"
                  value={defaultBillingDay}
                  onChange={(e) => setDefaultBillingDay(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="app-url">App URL</Label>
                <Input
                  id="app-url"
                  placeholder="https://app.cambridgestudio.com"
                  value={appUrl}
                  onChange={(e) => setAppUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agency-name">Agency Name</Label>
                <Input
                  id="agency-name"
                  placeholder="Cambridge Studio"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Team */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4" />
                Admin Team
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="mr-2 size-4" />
                Invite Admin
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {adminUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No admin users found.</p>
            ) : (
              <div className="divide-y">
                {adminUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 py-2.5">
                    <Shield className="size-4 text-muted-foreground" />
                    <span className="text-sm">{user.email}</span>
                    <Badge variant="secondary" className="text-xs">admin</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save All Settings
          </Button>
        </div>
      </div>

      <InviteClientDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizations={[]}
        onSuccess={() => window.location.reload()}
      />
    </PageWrapper>
  )
}
