import { useMemo } from 'react'
import VariablePill from './VariablePill'
import type { VariableSchemaField } from '@/types/database'

interface ClauseContentRendererProps {
  content: string
  variableSchema: Record<string, VariableSchemaField>
  onVariableClick?: (variableName: string) => void
}

interface ContentSegment {
  type: 'html' | 'variable'
  value: string
}

export default function ClauseContentRenderer({
  content,
  variableSchema,
  onVariableClick,
}: ClauseContentRendererProps) {
  const segments = useMemo<ContentSegment[]>(() => {
    const result: ContentSegment[] = []
    const regex = /\{\{(\w+)\}\}/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(content)) !== null) {
      // Add any HTML text before this match
      if (match.index > lastIndex) {
        result.push({
          type: 'html',
          value: content.slice(lastIndex, match.index),
        })
      }

      // Add the variable segment
      result.push({
        type: 'variable',
        value: match[1],
      })

      lastIndex = match.index + match[0].length
    }

    // Add any remaining HTML after the last match
    if (lastIndex < content.length) {
      result.push({
        type: 'html',
        value: content.slice(lastIndex),
      })
    }

    return result
  }, [content])

  return (
    <div className="prose prose-sm max-w-none text-zinc-600">
      {segments.map((segment, index) => {
        if (segment.type === 'variable') {
          const field = variableSchema[segment.value]
          const displayName = field?.label || segment.value
          return (
            <VariablePill
              key={`var-${index}-${segment.value}`}
              name={displayName}
              onClick={
                onVariableClick
                  ? () => onVariableClick(segment.value)
                  : undefined
              }
            />
          )
        }

        return (
          <span
            key={`html-${index}`}
            dangerouslySetInnerHTML={{ __html: segment.value }}
          />
        )
      })}
    </div>
  )
}
