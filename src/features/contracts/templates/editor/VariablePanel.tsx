import { useState, useRef, useEffect, useMemo } from 'react'
import { Trash2, Plus, Variable } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import type { ContractTemplateClause, VariableSchemaField } from '@/types/database'

const VARIABLE_TYPES: VariableSchemaField['type'][] = [
  'text',
  'textarea',
  'number',
  'currency',
  'date',
  'select',
  'boolean',
]

const SOURCE_OPTIONS = [
  { value: 'none', label: '(none)' },
  { value: 'organization', label: 'Organization' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'auto', label: 'Auto' },
]

interface VariablePanelProps {
  variableSchema: Record<string, VariableSchemaField>
  clauses: ContractTemplateClause[]
  onUpdateVariable: (varName: string, updates: Partial<VariableSchemaField>) => void
  onRemoveVariable: (varName: string) => void
  onAddVariable: (varName: string) => void
  onScrollToClause?: (clauseId: string) => void
  variableRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>
}

interface ClauseReference {
  clauseId: string
  title: string
  sectionNumber: string | null
}

export default function VariablePanel({
  variableSchema,
  clauses,
  onUpdateVariable,
  onRemoveVariable,
  onAddVariable,
  onScrollToClause,
  variableRefs,
}: VariablePanelProps) {
  const [showAddVariable, setShowAddVariable] = useState(false)
  const [newVariableName, setNewVariableName] = useState('')
  const addVariableInputRef = useRef<HTMLInputElement>(null)

  // Focus input when add form opens
  useEffect(() => {
    if (showAddVariable && addVariableInputRef.current) {
      addVariableInputRef.current.focus()
    }
  }, [showAddVariable])

  // Compute "Used in" mapping: variable name -> list of clauses that reference it
  const usedInMap = useMemo(() => {
    const map = new Map<string, ClauseReference[]>()

    const variableNames = Object.keys(variableSchema)

    for (const varName of variableNames) {
      const references: ClauseReference[] = []
      const pattern = new RegExp(`\\{\\{${varName}\\}\\}`)

      for (const clause of clauses) {
        if (pattern.test(clause.content)) {
          references.push({
            clauseId: clause.id,
            title: clause.title,
            sectionNumber: clause.section_number,
          })
        }
      }

      map.set(varName, references)
    }

    return map
  }, [variableSchema, clauses])

  // Group variables by source
  const { autoVariables, adminVariables } = useMemo(() => {
    const auto: [string, VariableSchemaField][] = []
    const admin: [string, VariableSchemaField][] = []

    for (const [varName, field] of Object.entries(variableSchema)) {
      if (
        field.source === 'auto' ||
        field.source === 'organization' ||
        field.source === 'proposal'
      ) {
        auto.push([varName, field])
      } else {
        admin.push([varName, field])
      }
    }

    // Sort each group alphabetically
    auto.sort(([a], [b]) => a.localeCompare(b))
    admin.sort(([a], [b]) => a.localeCompare(b))

    return { autoVariables: auto, adminVariables: admin }
  }, [variableSchema])

  function handleAddVariable() {
    const trimmed = newVariableName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')

    if (!trimmed) return

    onAddVariable(trimmed)
    setNewVariableName('')
    setShowAddVariable(false)
  }

  const totalVariables = Object.keys(variableSchema).length

  function renderVariableCard(varName: string, field: VariableSchemaField) {
    const references = usedInMap.get(varName) || []

    return (
      <Card
        key={varName}
        ref={(el: HTMLDivElement | null) => {
          if (variableRefs?.current) {
            variableRefs.current[varName] = el
          }
        }}
        className="p-3 gap-3"
      >
        {/* Variable Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <code className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {`{{${varName}}}`}
            </code>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemoveVariable(varName)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Type + Source selectors */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={field.type}
              onValueChange={(val) =>
                onUpdateVariable(varName, {
                  type: val as VariableSchemaField['type'],
                })
              }
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VARIABLE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Source</Label>
            <Select
              value={field.source ?? 'none'}
              onValueChange={(val) =>
                onUpdateVariable(varName, {
                  source:
                    val === 'none'
                      ? undefined
                      : (val as VariableSchemaField['source']),
                })
              }
            >
              <SelectTrigger className="h-8 text-xs w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Label */}
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Label</Label>
          <Input
            value={field.label}
            onChange={(e) =>
              onUpdateVariable(varName, { label: e.target.value })
            }
            className="h-8 text-sm"
            placeholder="Display label"
          />
        </div>

        {/* Default Value (hidden for boolean) */}
        {field.type !== 'boolean' && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">
              Default Value
            </Label>
            <Input
              value={field.default != null ? String(field.default) : ''}
              onChange={(e) =>
                onUpdateVariable(varName, {
                  default: e.target.value || undefined,
                })
              }
              className="h-8 text-sm"
              placeholder="Optional default"
            />
          </div>
        )}

        {/* Required Toggle */}
        <div className="flex items-center justify-between pt-1">
          <Label className="text-xs text-muted-foreground">Required</Label>
          <Switch
            checked={field.required}
            onCheckedChange={(checked) =>
              onUpdateVariable(varName, { required: checked })
            }
            size="sm"
          />
        </div>

        {/* Used in clauses */}
        {references.length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Used in
              </Label>
              <div className="flex flex-col gap-1">
                {references.map((ref) => (
                  <button
                    key={ref.clauseId}
                    type="button"
                    onClick={() => onScrollToClause?.(ref.clauseId)}
                    className="text-left text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors truncate"
                  >
                    {ref.sectionNumber
                      ? `${ref.sectionNumber}. ${ref.title}`
                      : ref.title}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>
    )
  }

  function renderVariableGroup(
    label: string,
    entries: [string, VariableSchemaField][]
  ) {
    if (entries.length === 0) return null

    return (
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
          {label}
        </p>
        {entries.map(([varName, field]) => renderVariableCard(varName, field))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Variables</span>
          <Badge variant="secondary" className="text-xs">
            {totalVariables}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAddVariable(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Variable
        </Button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Add Variable Form */}
        {showAddVariable && (
          <Card className="p-3 border-dashed border-2 border-primary/30 gap-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">New Variable Name</Label>
              <div className="flex gap-2">
                <Input
                  ref={addVariableInputRef}
                  value={newVariableName}
                  onChange={(e) => setNewVariableName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddVariable()
                    if (e.key === 'Escape') {
                      setShowAddVariable(false)
                      setNewVariableName('')
                    }
                  }}
                  placeholder="e.g. client_name"
                  className="h-8 text-sm font-mono"
                />
                <Button size="sm" onClick={handleAddVariable}>
                  Add
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAddVariable(false)
                    setNewVariableName('')
                  }}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use snake_case. Only letters, numbers, and underscores.
              </p>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {totalVariables === 0 && !showAddVariable && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Variable className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              No variables defined yet.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add variables manually or use{' '}
              <code className="rounded bg-muted px-1 py-0.5 text-xs font-mono">
                {'{{variable_name}}'}
              </code>{' '}
              in clause content.
            </p>
          </div>
        )}

        {/* Variable groups */}
        {autoVariables.length > 0 && adminVariables.length > 0 ? (
          <>
            {renderVariableGroup('Auto-populated', autoVariables)}
            <Separator />
            {renderVariableGroup('Admin Input', adminVariables)}
          </>
        ) : (
          <>
            {renderVariableGroup('Auto-populated', autoVariables)}
            {renderVariableGroup('Admin Input', adminVariables)}
          </>
        )}
      </div>
    </div>
  )
}
