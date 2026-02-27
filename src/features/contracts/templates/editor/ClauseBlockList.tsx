import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import ClauseBlock from './ClauseBlock'
import type { ContractTemplateClause, VariableSchemaField } from '@/types/database'

interface ClauseBlockListProps {
  clauses: ContractTemplateClause[]
  unlockedClauseId: string | null
  conditionalToggles: Record<string, boolean>
  variableSchema: Record<string, VariableSchemaField>
  onReorder: (clauses: ContractTemplateClause[]) => void
  onToggleLock: (clauseId: string) => void
  onToggleConditional: (clauseKey: string, enabled: boolean) => void
  onContentChange: (clauseId: string, html: string) => void
  onVariableClick?: (variableName: string) => void
}

export default function ClauseBlockList({
  clauses,
  unlockedClauseId,
  conditionalToggles,
  variableSchema,
  onReorder,
  onToggleLock,
  onToggleConditional,
  onContentChange,
  onVariableClick,
}: ClauseBlockListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = clauses.findIndex((c) => c.id === active.id)
    const newIndex = clauses.findIndex((c) => c.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(clauses, oldIndex, newIndex).map(
      (clause, index) => ({
        ...clause,
        sort_order: index,
      })
    )

    onReorder(reordered)
  }

  const clauseIds = clauses.map((c) => c.id)

  return (
    <div className="overflow-y-auto flex-1">
      <div className="space-y-3 p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={clauseIds}
            strategy={verticalListSortingStrategy}
          >
            {clauses.map((clause) => (
              <ClauseBlock
                key={clause.id}
                clause={clause}
                isUnlocked={unlockedClauseId === clause.id}
                isConditionalEnabled={
                  conditionalToggles[clause.clause_key] ?? true
                }
                onToggleLock={onToggleLock}
                onToggleConditional={onToggleConditional}
                onContentChange={onContentChange}
                onVariableClick={onVariableClick}
                variableSchema={variableSchema}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
