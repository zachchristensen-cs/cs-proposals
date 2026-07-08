import { useState, useEffect } from 'react'
import { Loader2, Check, Bot } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { TeamRosterSettings } from './TeamRosterSettings'

export function SettingsPage() {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [settingsId, setSettingsId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('id, system_prompt')
        .limit(1)
        .single()

      if (error) {
        console.error('Failed to load settings:', error)
      } else if (data) {
        setSettingsId(data.id)
        setPrompt(data.system_prompt ?? '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settingsId) return
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('admin_settings')
      .update({ system_prompt: prompt })
      .eq('id', settingsId)

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Prompt saved' })
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <PageWrapper title="Settings" description="Workspace configuration">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading...
        </div>
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Settings" description="Workspace configuration">
      <TeamRosterSettings />

      <Separator className="my-8" />

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground">
            AI System Prompt
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          This prompt controls how the AI generates proposals. Changes take
          effect on the next new conversation.
        </p>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="system-prompt">Prompt</Label>
            <Textarea
              id="system-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={saving}
              rows={24}
              className="font-mono text-xs leading-relaxed"
              placeholder="Enter the system prompt for proposal generation..."
            />
          </div>

          {message && (
            <p
              className={`flex items-center gap-1.5 text-sm ${
                message.type === 'success'
                  ? 'text-green-600'
                  : 'text-destructive'
              }`}
            >
              {message.type === 'success' && <Check className="size-3.5" />}
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save Prompt
          </Button>
        </form>
      </section>
    </PageWrapper>
  )
}
