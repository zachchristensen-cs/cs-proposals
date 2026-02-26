import { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { VariableSchemaField } from '@/types/database'

interface TemplatePreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  content: string
  variableSchema: Record<string, VariableSchemaField>
}

function generateMockValue(_key: string, field: VariableSchemaField): string {
  switch (field.type) {
    case 'text': {
      const label = field.label.toLowerCase()
      if (label.includes('name') && label.includes('company')) return 'Sample Company'
      if (label.includes('company') || label.includes('organization') || label.includes('business'))
        return 'Sample Company'
      if (label.includes('name')) return 'John Doe'
      if (label.includes('address'))
        return '123 Main St, Suite 100, San Francisco, CA 94105'
      if (label.includes('email')) return 'john@example.com'
      if (label.includes('phone')) return '(555) 123-4567'
      if (label.includes('title')) return 'Project Manager'
      return 'Sample Text'
    }
    case 'textarea':
      return 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'
    case 'number':
      return '10'
    case 'currency':
      return '$5,000'
    case 'date': {
      const today = new Date()
      return today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    }
    case 'select':
      return field.options?.[0] ?? 'Option A'
    case 'boolean':
      return 'true'
    default:
      return 'Sample Text'
  }
}

function generateSampleItems(blockName: string): string[] {
  const name = blockName.toLowerCase()

  if (name.includes('phase') || name.includes('scope')) {
    return [
      '<li><strong>Discovery & Research</strong> — Initial research, stakeholder interviews, and competitive analysis.</li>',
      '<li><strong>Design & Prototyping</strong> — Wireframes, visual design, and interactive prototypes.</li>',
      '<li><strong>Development & Launch</strong> — Front-end and back-end development, testing, and deployment.</li>',
    ]
  }

  if (name.includes('payment') || name.includes('milestone') || name.includes('invoice')) {
    return [
      '<li>$2,500 — Due upon signing</li>',
      '<li>$2,500 — Due at project midpoint</li>',
    ]
  }

  if (name.includes('deliverable')) {
    return [
      '<li>Brand guidelines document</li>',
      '<li>Website design mockups (desktop & mobile)</li>',
      '<li>Final production-ready assets</li>',
    ]
  }

  return [
    '<li>Item 1 — Sample description for the first item.</li>',
    '<li>Item 2 — Sample description for the second item.</li>',
    '<li>Item 3 — Sample description for the third item.</li>',
  ]
}

function processTemplate(
  content: string,
  variableSchema: Record<string, VariableSchemaField>
): string {
  let processed = content

  // Build mock values map
  const mockValues: Record<string, string> = {}
  for (const [key, field] of Object.entries(variableSchema)) {
    mockValues[key] = generateMockValue(key, field)
  }

  // Handle {{#each blockName}} ... {{/each}} blocks
  processed = processed.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_match, blockName: string) => {
      const items = generateSampleItems(blockName)
      return `<ul>${items.join('\n')}</ul>`
    }
  )

  // Handle {{#if variableName}} ... {{/if}} blocks (assume condition is true, include content)
  processed = processed.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, _varName: string, innerContent: string) => {
      return innerContent
    }
  )

  // Replace {{variable_name}} placeholders with mock values
  processed = processed.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    if (mockValues[varName] !== undefined) {
      return `<span class="bg-blue-50 text-blue-700 px-1 rounded">${mockValues[varName]}</span>`
    }
    return `<span class="bg-amber-50 text-amber-700 px-1 rounded">{{${varName}}}</span>`
  })

  return processed
}

export function TemplatePreview({
  open,
  onOpenChange,
  content,
  variableSchema,
}: TemplatePreviewProps) {
  const renderedHtml = useMemo(
    () => processTemplate(content, variableSchema),
    [content, variableSchema]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
          <DialogDescription>
            Preview with sample data. Actual values are filled during contract creation.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto mt-4">
          <div
            className="bg-white rounded-lg border p-8 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
