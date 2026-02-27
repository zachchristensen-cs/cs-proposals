import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { ContractTemplateClause, VariableSchemaField } from '@/types/database'

interface TemplatePreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clauses: ContractTemplateClause[]
  variableSchema: Record<string, VariableSchemaField>
  conditionalToggles: Record<string, boolean>
}

function generateMockValue(key: string, field: VariableSchemaField): string {
  const k = key.toLowerCase()
  const label = field.label.toLowerCase()

  // Check key and label for known patterns
  if (k.includes('company') || k.includes('business') || label.includes('company') || label.includes('business') || label.includes('organization')) {
    return 'Acme Corporation'
  }
  if (k.includes('address') || label.includes('address')) {
    return '650 Union St., Brooklyn, NY 11215'
  }
  if (k.includes('email') || label.includes('email')) {
    return 'jane@acme.com'
  }
  if (k.includes('name') || label.includes('name')) {
    return 'Jane Smith'
  }
  if (k.includes('title') || label.includes('title')) {
    return 'CEO'
  }
  if (k.includes('phone') || label.includes('phone')) {
    return '(555) 123-4567'
  }

  switch (field.type) {
    case 'text':
      return (field.default as string) ?? '[Variable Name]'
    case 'textarea':
      return (field.default as string) ?? 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
    case 'number':
      return '10'
    case 'currency':
      return '$5,000.00'
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
      return 'Yes'
    default: {
      if (field.default != null) return String(field.default)
      return '[Variable Name]'
    }
  }
}

function generateSampleItems(blockName: string): string {
  const name = blockName.toLowerCase()

  if (name.includes('phase') || name.includes('scope')) {
    return [
      '<li style="margin-bottom:6px;"><strong>Phase 1: Discovery &amp; Research</strong> &mdash; Initial research, stakeholder interviews, and competitive analysis. <em>Timeline: 2 weeks.</em></li>',
      '<li style="margin-bottom:6px;"><strong>Phase 2: Design &amp; Prototyping</strong> &mdash; Wireframes, visual design, and interactive prototypes. <em>Timeline: 3 weeks.</em></li>',
      '<li style="margin-bottom:6px;"><strong>Phase 3: Development</strong> &mdash; Front-end and back-end development, integrations, and testing. <em>Timeline: 4 weeks.</em></li>',
      '<li style="margin-bottom:6px;"><strong>Phase 4: Launch &amp; Handoff</strong> &mdash; Deployment, QA, documentation, and team training. <em>Timeline: 1 week.</em></li>',
    ].join('\n')
  }

  if (name.includes('payment') || name.includes('milestone') || name.includes('invoice')) {
    return [
      '<li style="margin-bottom:6px;">$2,500.00 &mdash; Due upon contract signing</li>',
      '<li style="margin-bottom:6px;">$2,500.00 &mdash; Due at project midpoint</li>',
      '<li style="margin-bottom:6px;">$2,500.00 &mdash; Due upon project completion</li>',
    ].join('\n')
  }

  if (name.includes('deliverable')) {
    return [
      '<li style="margin-bottom:6px;">Brand guidelines document</li>',
      '<li style="margin-bottom:6px;">Website design mockups (desktop &amp; mobile)</li>',
      '<li style="margin-bottom:6px;">Final production-ready assets</li>',
    ].join('\n')
  }

  return [
    '<li style="margin-bottom:6px;">Item 1 &mdash; Sample description for the first item.</li>',
    '<li style="margin-bottom:6px;">Item 2 &mdash; Sample description for the second item.</li>',
    '<li style="margin-bottom:6px;">Item 3 &mdash; Sample description for the third item.</li>',
  ].join('\n')
}

function processClauseContent(
  content: string,
  variableSchema: Record<string, VariableSchemaField>,
  highlight: boolean
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
      return `<ol style="padding-left:1.5em;margin:0.75em 0;">${items}</ol>`
    }
  )

  // Handle {{#if variableName}} ... {{/if}} blocks — always include the content
  processed = processed.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, _varName: string, innerContent: string) => {
      return innerContent
    }
  )

  // Replace {{variable_name}} placeholders with mock values
  processed = processed.replace(/\{\{(\w+)\}\}/g, (_match, varName: string) => {
    const value = mockValues[varName]
    if (value !== undefined) {
      if (highlight) {
        return `<span style="background:#fef9c3;padding:0 2px;border-radius:2px;">${value}</span>`
      }
      return value
    }
    // Unknown variable — show placeholder
    const displayName = varName.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    if (highlight) {
      return `<span style="background:#fef9c3;padding:0 2px;border-radius:2px;">[${displayName}]</span>`
    }
    return `[${displayName}]`
  })

  return processed
}

export function TemplatePreview({
  open,
  onOpenChange,
  clauses,
  variableSchema,
  conditionalToggles,
}: TemplatePreviewProps) {
  const [highlightVariables, setHighlightVariables] = useState(true)

  // Filter out conditional clauses that are toggled off
  const visibleClauses = useMemo(() => {
    return clauses
      .filter((clause) => {
        if (clause.is_conditional) {
          return conditionalToggles[clause.clause_key] !== false
        }
        return true
      })
      .sort((a, b) => a.sort_order - b.sort_order)
  }, [clauses, conditionalToggles])

  const renderedClauses = useMemo(() => {
    return visibleClauses.map((clause) => ({
      id: clause.id,
      sectionNumber: clause.section_number,
      title: clause.title,
      html: processClauseContent(clause.content, variableSchema, highlightVariables),
    }))
  }, [visibleClauses, variableSchema, highlightVariables])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Contract Preview</DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              <Switch
                id="highlight-toggle"
                checked={highlightVariables}
                onCheckedChange={setHighlightVariables}
              />
              <Label htmlFor="highlight-toggle" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Highlight variables
              </Label>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          <div
            className="bg-white rounded-lg border px-12 py-10"
            style={{
              fontFamily: "'Georgia', 'Times New Roman', serif",
              maxWidth: 700,
              margin: '0 auto',
              lineHeight: 1.7,
              color: '#1a1a1a',
            }}
          >
            {renderedClauses.map((clause, index) => (
              <div key={clause.id} style={{ marginTop: index === 0 ? 0 : '2rem' }}>
                <h2
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    marginTop: 0,
                    marginBottom: '0.75rem',
                    lineHeight: 1.4,
                    color: '#1a1a1a',
                  }}
                >
                  {clause.sectionNumber ? `${clause.sectionNumber}. ` : ''}
                  {clause.title}
                </h2>
                <div
                  dangerouslySetInnerHTML={{ __html: clause.html }}
                  style={{ fontSize: '0.95rem' }}
                />
              </div>
            ))}

            {/* Signature Block */}
            <div style={{ marginTop: '3rem', borderTop: '1px solid #e5e5e5', paddingTop: '2rem' }}>
              <h2
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  marginBottom: '1.5rem',
                  color: '#1a1a1a',
                }}
              >
                Signatures
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '48%', verticalAlign: 'top', paddingRight: '4%' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        CLIENT
                      </div>
                      <div style={{ borderBottom: '1px solid #999', height: 40, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Signature</div>
                      <div style={{ marginTop: '1rem', borderBottom: '1px solid #999', height: 24, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Printed Name &amp; Title</div>
                      <div style={{ marginTop: '1rem', borderBottom: '1px solid #999', height: 24, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Date</div>
                    </td>
                    <td style={{ width: '48%', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                        SERVICE PROVIDER
                      </div>
                      <div style={{ borderBottom: '1px solid #999', height: 40, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Signature</div>
                      <div style={{ marginTop: '1rem', borderBottom: '1px solid #999', height: 24, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Printed Name &amp; Title</div>
                      <div style={{ marginTop: '1rem', borderBottom: '1px solid #999', height: 24, marginBottom: '0.5rem' }} />
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Date</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
