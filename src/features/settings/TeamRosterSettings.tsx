import { useEffect, useRef, useState } from 'react'
import { Loader2, Users, Plus, Trash2, ArrowUp, ArrowDown, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AgencyTeamMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

interface MemberRowProps {
  member: AgencyTeamMember
  isFirst: boolean
  isLast: boolean
  onSaved: (member: AgencyTeamMember) => void
  onDelete: (member: AgencyTeamMember) => void
  onMove: (member: AgencyTeamMember, direction: -1 | 1) => void
}

function MemberRow({ member, isFirst, isLast, onSaved, onDelete, onMove }: MemberRowProps) {
  const [name, setName] = useState(member.name)
  const [role, setRole] = useState(member.role)
  const [bio, setBio] = useState(member.bio)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dirty = name !== member.name || role !== member.role || bio !== member.bio

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    const updates = {
      name: name.trim(),
      role: role.trim(),
      bio: bio.trim(),
      initials: initialsFromName(name),
    }
    const { error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', member.id)

    if (error) {
      toast.error(error.message)
    } else {
      onSaved({ ...member, ...updates })
    }
    setSaving(false)
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${member.id}-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('team-headshots')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      toast.error(uploadError.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('team-headshots').getPublicUrl(path)
    const photo_url = data.publicUrl

    const { error } = await supabase
      .from('team_members')
      .update({ photo_url })
      .eq('id', member.id)

    if (error) {
      toast.error(error.message)
    } else {
      onSaved({ ...member, photo_url })
      toast.success('Headshot updated')
    }
    setUploading(false)
  }

  return (
    <div className="flex gap-4 rounded-lg border p-4">
      {/* Headshot */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="group relative block size-14 overflow-hidden rounded-full bg-muted"
          title="Upload headshot"
        >
          {member.photo_url ? (
            <img
              src={member.photo_url}
              alt={member.name}
              className="size-full object-cover"
            />
          ) : (
            <span className="flex size-full items-center justify-center text-sm font-medium text-muted-foreground">
              {member.initials || initialsFromName(name)}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            {uploading ? (
              <Loader2 className="size-4 animate-spin text-white" />
            ) : (
              <Camera className="size-4 text-white" />
            )}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handlePhotoUpload(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* Fields */}
      <div className="flex-1 space-y-2">
        <div className="grid gap-2 sm:grid-cols-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            disabled={saving}
          />
          <Input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Position (e.g. Design Director)"
            disabled={saving}
          />
        </div>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Short bio shown in proposals (optional)"
          rows={2}
          disabled={saving}
          className="text-sm"
        />
        {dirty && (
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 size-3.5 animate-spin" />}
            Save
          </Button>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={isFirst}
          onClick={() => onMove(member, -1)}
          title="Move up"
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={isLast}
          onClick={() => onMove(member, 1)}
          title="Move down"
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(member)}
          title="Remove member"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

export function TeamRosterSettings() {
  const [members, setMembers] = useState<AgencyTeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AgencyTeamMember | null>(null)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error) {
        toast.error(`Failed to load team: ${error.message}`)
      } else {
        setMembers((data as AgencyTeamMember[]) ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  function handleSaved(updated: AgencyTeamMember) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
  }

  async function handleAdd() {
    setAdding(true)
    const sort_order = (members[members.length - 1]?.sort_order ?? 0) + 1
    const { data, error } = await supabase
      .from('team_members')
      .insert({ name: 'New member', role: '', bio: '', initials: 'NM', sort_order })
      .select()
      .single()

    if (error) {
      toast.error(error.message)
    } else {
      setMembers((prev) => [...prev, data as AgencyTeamMember])
    }
    setAdding(false)
  }

  async function handleDelete(member: AgencyTeamMember) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', member.id)

    if (error) {
      toast.error(error.message)
    } else {
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      toast.success(`${member.name} removed`)
    }
    setDeleteTarget(null)
  }

  async function handleMove(member: AgencyTeamMember, direction: -1 | 1) {
    const index = members.findIndex((m) => m.id === member.id)
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= members.length) return

    const other = members[swapIndex]
    const updated = [...members]
    updated[index] = { ...other, sort_order: member.sort_order }
    updated[swapIndex] = { ...member, sort_order: other.sort_order }
    setMembers(updated)

    const [res1, res2] = await Promise.all([
      supabase.from('team_members').update({ sort_order: other.sort_order }).eq('id', member.id),
      supabase.from('team_members').update({ sort_order: member.sort_order }).eq('id', other.id),
    ])
    const error = res1.error || res2.error
    if (error) {
      toast.error(error.message)
      setMembers(members)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground">
          Proposal Team
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Team members shown in the "Your Team" section of proposals. The AI uses
        this roster when generating new proposals.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading team...
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((member, i) => (
            <MemberRow
              key={member.id}
              member={member}
              isFirst={i === 0}
              isLast={i === members.length - 1}
              onSaved={handleSaved}
              onDelete={setDeleteTarget}
              onMove={handleMove}
            />
          ))}
          <Button variant="outline" size="sm" onClick={handleAdd} disabled={adding}>
            {adding ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Plus className="mr-2 size-3.5" />
            )}
            Add team member
          </Button>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll no longer appear in the team roster for new proposals.
              Existing proposals are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
