import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Save, Eye } from 'lucide-react'
import ClauseBlockList from './editor/ClauseBlockList'
import VariablePanel from './editor/VariablePanel'
import { TemplatePreview } from './TemplatePreview'
import type {
  ContractTemplate,
  ContractTemplateClause,
  VariableSchemaField,
} from '@/types/database'

const TYPE_BADGE_COLORS: Record<string, string> = {
  msa: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  sow: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  exhibit: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
}

export default function TemplateEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [template, setTemplate] = useState<ContractTemplate | null>(null)
  const [clauses, setClauses] = useState<ContractTemplateClause[]>([])
  const [variableSchema, setVariableSchema] = useState<
    Record<string, VariableSchemaField>
  >({})
  const [unlockedClauseId, setUnlockedClauseId] = useState<string | null>(null)
  const [conditionalToggles, setConditionalToggles] = useState<
    Record<string, boolean>
  >({})
  const [showPreview, setShowPreview] = useState(false)

  // Cross-panel scroll refs
  const variableRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const clauseListRef = useRef<HTMLDivElement | null>(null)

  // Fetch template + clauses in parallel on mount
  useEffect(() => {
    if (!id) return

    async function fetchData() {
      setLoading(true)

      const [templateRes, clausesRes] = await Promise.all([
        supabase.from('contract_templates').select('*').eq('id', id).single(),
        supabase
          .from('contract_template_clauses')
          .select('*')
          .eq('template_id', id)
          .order('sort_order'),
      ])

      if (templateRes.error || !templateRes.data) {
        toast.error('Failed to load template')
        console.error(templateRes.error)
        setLoading(false)
        return
      }

      if (clausesRes.error) {
        toast.error('Failed to load clauses')
        console.error(clausesRes.error)
        setLoading(false)
        return
      }

      const t = templateRes.data as ContractTemplate
      const c = (clausesRes.data ?? []) as ContractTemplateClause[]

      setTemplate(t)
      setClauses(c)
      setVariableSchema(t.variable_schema ?? {})

      // Initialize conditional toggles: all default to true
      const toggles: Record<string, boolean> = {}
      for (const clause of c) {
        if (clause.is_conditional) {
          toggles[clause.clause_key] = true
        }
      }
      setConditionalToggles(toggles)

      setLoading(false)
    }

    fetchData()
  }, [id])

  // Clause operations
  const handleReorder = useCallback(
    (reorderedClauses: ContractTemplateClause[]) => {
      setClauses(reorderedClauses)
    },
    []
  )

  const handleToggleLock = useCallback(
    (clauseId: string) => {
      setUnlockedClauseId((prev) => (prev === clauseId ? null : clauseId))
    },
    []
  )

  const handleToggleConditional = useCallback(
    (clauseKey: string, enabled: boolean) => {
      setConditionalToggles((prev) => ({ ...prev, [clauseKey]: enabled }))
    },
    []
  )

  const handleContentChange = useCallback(
    (clauseId: string, html: string) => {
      setClauses((prev) =>
        prev.map((c) => (c.id === clauseId ? { ...c, content: html } : c))
      )

      // Auto-add new variables found in clause content
      const regex = /\{\{(\w+)\}\}/g
      const foundVars = new Set<string>()
      let match: RegExpExecArray | null
      while ((match = regex.exec(html)) !== null) {
        foundVars.add(match[1])
      }

      setVariableSchema((prev) => {
        const updated = { ...prev }
        let changed = false
        for (const varName of foundVars) {
          if (!updated[varName]) {
            updated[varName] = {
              type: 'text',
              label: varName
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase()),
              required: false,
            }
            changed = true
          }
        }
        return changed ? updated : prev
      })
    },
    []
  )

  const handleVariableClick = useCallback((varName: string) => {
    const el = variableRefs.current[varName]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      // Brief highlight effect
      el.classList.add('ring-2', 'ring-blue-400')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-blue-400')
      }, 1500)
    }
  }, [])

  const handleScrollToClause = useCallback((clauseId: string) => {
    // Find the clause card in the DOM via data attribute on dnd-kit sortable
    const listEl = clauseListRef.current
    if (!listEl) return

    const container = listEl.querySelector('.space-y-3')
    if (!container) return

    const clauseIndex = clauses.findIndex((c) => c.id === clauseId)
    if (clauseIndex === -1) return

    const child = container.children[clauseIndex] as HTMLElement | undefined
    if (child) {
      child.scrollIntoView({ behavior: 'smooth', block: 'center' })
      child.classList.add('ring-2', 'ring-blue-400')
      setTimeout(() => {
        child.classList.remove('ring-2', 'ring-blue-400')
      }, 1500)
    }
  }, [clauses])

  // Variable operations
  const updateVariable = useCallback(
    (varName: string, updates: Partial<VariableSchemaField>) => {
      setVariableSchema((prev) => ({
        ...prev,
        [varName]: { ...prev[varName], ...updates },
      }))
    },
    []
  )

  const removeVariable = useCallback((varName: string) => {
    setVariableSchema((prev) => {
      const updated = { ...prev }
      delete updated[varName]
      return updated
    })
  }, [])

  const addVariable = useCallback(
    (varName: string) => {
      if (variableSchema[varName]) {
        toast.error(`Variable "${varName}" already exists`)
        return
      }

      setVariableSchema((prev) => ({
        ...prev,
        [varName]: {
          type: 'text',
          label: varName
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          required: false,
        },
      }))

      toast.success(`Variable "{{${varName}}}" added`)
    },
    [variableSchema]
  )

  // previewContent removed — TemplatePreview now renders from clauses directly

  // Save as new version
  async function handleSave() {
    if (!template || !user) return

    setSaving(true)

    try {
      // 1. Deactivate current template
      const { error: deactivateError } = await supabase
        .from('contract_templates')
        .update({ is_active: false })
        .eq('id', template.id)

      if (deactivateError) {
        toast.error('Failed to deactivate current version')
        console.error(deactivateError)
        setSaving(false)
        return
      }

      // 2. Get next version number
      const { data: versions, error: versionError } = await supabase
        .from('contract_templates')
        .select('version')
        .eq('type', template.type)
        .eq('name', template.name)
        .order('version', { ascending: false })
        .limit(1)

      if (versionError) {
        toast.error('Failed to determine version')
        console.error(versionError)
        setSaving(false)
        return
      }

      const nextVersion = (versions?.[0]?.version ?? template.version) + 1

      // 3. Insert new template row
      const { data: newTemplate, error: insertError } = await supabase
        .from('contract_templates')
        .insert({
          type: template.type,
          name: template.name,
          content: '',
          variable_schema: variableSchema,
          version: nextVersion,
          is_active: true,
          created_by: user.id,
        })
        .select()
        .single()

      if (insertError || !newTemplate) {
        toast.error('Failed to save new version')
        console.error(insertError)
        setSaving(false)
        return
      }

      // 4. Bulk insert clause rows mapped to new template_id
      const clauseInserts = clauses.map((clause) => ({
        template_id: newTemplate.id,
        clause_key: clause.clause_key,
        title: clause.title,
        section_number: clause.section_number,
        content: clause.content,
        is_conditional: clause.is_conditional,
        condition_description: clause.condition_description,
        sort_order: clause.sort_order,
        is_locked: true,
      }))

      if (clauseInserts.length > 0) {
        const { error: clauseInsertError } = await supabase
          .from('contract_template_clauses')
          .insert(clauseInserts)

        if (clauseInsertError) {
          toast.error('Template saved but clause copy failed')
          console.error(clauseInsertError)
        }
      }

      toast.success(`Saved as version ${nextVersion}`)
      navigate(`/admin/settings/templates/${newTemplate.id}`, {
        replace: true,
      })
    } catch (err) {
      toast.error('An unexpected error occurred')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading template...
      </div>
    )
  }

  if (!template) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Template not found.</p>
        <Button variant="outline" asChild>
          <Link to="/admin/settings/templates">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Templates
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Bar */}
      <div className="flex items-center gap-3 border-b px-4 py-3 shrink-0">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/admin/settings/templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <span className="font-medium text-sm">{template.name}</span>

        <Badge className={TYPE_BADGE_COLORS[template.type] ?? ''}>
          {template.type.toUpperCase()}
        </Badge>

        <Badge variant="outline">v{template.version}</Badge>

        <Badge
          className={
            template.is_active
              ? 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-200'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-400'
          }
        >
          {template.is_active ? 'Active' : 'Inactive'}
        </Badge>

        <div className="flex-1" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(true)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save New Version'}
        </Button>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — Clause Block List */}
        <div className="w-[65%] border-r flex flex-col" ref={clauseListRef}>
          <ClauseBlockList
            clauses={clauses}
            unlockedClauseId={unlockedClauseId}
            conditionalToggles={conditionalToggles}
            variableSchema={variableSchema}
            onReorder={handleReorder}
            onToggleLock={handleToggleLock}
            onToggleConditional={handleToggleConditional}
            onContentChange={handleContentChange}
            onVariableClick={handleVariableClick}
          />
        </div>

        {/* Right Panel — Variable Panel */}
        <div className="w-[35%] flex flex-col">
          <VariablePanel
            variableSchema={variableSchema}
            clauses={clauses}
            onUpdateVariable={updateVariable}
            onRemoveVariable={removeVariable}
            onAddVariable={addVariable}
            onScrollToClause={handleScrollToClause}
            variableRefs={variableRefs}
          />
        </div>
      </div>

      {/* Preview Dialog */}
      <TemplatePreview
        open={showPreview}
        onOpenChange={setShowPreview}
        clauses={clauses}
        variableSchema={variableSchema}
        conditionalToggles={conditionalToggles}
      />
    </div>
  )
}
