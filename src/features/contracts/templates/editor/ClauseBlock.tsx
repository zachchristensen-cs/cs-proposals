import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Lock, LockOpen } from 'lucide-react'
import TipTapEditor from '@/components/shared/TipTapEditor'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import ClauseContentRenderer from './ClauseContentRenderer'
import type { ContractTemplateClause, VariableSchemaField } from '@/types/database'

interface ClauseBlockProps {
  clause: ContractTemplateClause
  isUnlocked: boolean
  isConditionalEnabled: boolean
  onToggleLock: (clauseId: string) => void
  onToggleConditional: (clauseKey: string, enabled: boolean) => void
  onContentChange: (clauseId: string, html: string) => void
  onVariableClick?: (variableName: string) => void
  variableSchema: Record<string, VariableSchemaField>
}

export default function ClauseBlock({
  clause,
  isUnlocked,
  isConditionalEnabled,
  onToggleLock,
  onToggleConditional,
  onContentChange,
  onVariableClick,
  variableSchema,
}: ClauseBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: clause.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const isDisabledConditional = clause.is_conditional && !isConditionalEnabled

  const variableNames = Object.keys(variableSchema)

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-0 gap-0 transition-all',
        clause.is_conditional && 'border-dashed border-amber-300 bg-amber-50/50',
        isDisabledConditional && 'opacity-50'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-semibold text-zinc-900 truncate">
            {clause.section_number
              ? `${clause.section_number}. ${clause.title}`
              : clause.title}
          </span>
          {isDisabledConditional && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              Disabled
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Conditional toggle */}
          {clause.is_conditional && (
            <div className="flex items-center gap-1.5 mr-1">
              {clause.condition_description ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <Switch
                          size="sm"
                          checked={isConditionalEnabled}
                          onCheckedChange={(checked) =>
                            onToggleConditional(clause.clause_key, checked)
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="max-w-[200px]">{clause.condition_description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Switch
                  size="sm"
                  checked={isConditionalEnabled}
                  onCheckedChange={(checked) =>
                    onToggleConditional(clause.clause_key, checked)
                  }
                />
              )}
            </div>
          )}

          {/* Lock toggle */}
          <button
            type="button"
            onClick={() => onToggleLock(clause.id)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors"
            title={isUnlocked ? 'Lock clause' : 'Unlock clause for editing'}
          >
            {isUnlocked ? (
              <LockOpen className="h-4 w-4" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
          </button>

          {/* Drag handle */}
          <button
            type="button"
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Condition description */}
      {clause.is_conditional && clause.condition_description && (
        <div className="px-4 pt-2">
          <p className="text-xs text-amber-600 italic">
            Condition: {clause.condition_description}
          </p>
        </div>
      )}

      {/* Body */}
      <div className={cn('px-4 py-3', isUnlocked && 'bg-blue-50 rounded-b-xl')}>
        {isUnlocked ? (
          <TipTapEditor
            content={clause.content}
            onChange={(html) => onContentChange(clause.id, html)}
            variables={variableNames}
            placeholder="Write clause content..."
            className="min-h-[120px]"
          />
        ) : (
          <ClauseContentRenderer
            content={clause.content}
            variableSchema={variableSchema}
            onVariableClick={onVariableClick}
          />
        )}
      </div>
    </Card>
  )
}
