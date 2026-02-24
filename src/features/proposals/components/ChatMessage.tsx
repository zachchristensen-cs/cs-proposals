import { useState } from 'react'
import Markdown from 'react-markdown'
import { ChevronDown, ChevronUp, FileText } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  isGenerating?: boolean
  isLastAssistant?: boolean
  onOptionClick?: (optionText: string) => void
}

interface ParsedOption {
  letter: string
  text: string
}

/**
 * Parse a/b/c option blocks from assistant messages.
 * Handles multiple formats:
 *   1. Each option on its own line: "a) Option text\nb) Option text"
 *   2. Inline in a paragraph: "...question? a) Option one b) Option two c) Option three"
 *   3. Mixed with markdown bold questions
 */
function parseOptions(content: string): {
  before: string
  options: ParsedOption[]
  after: string
} {
  const lineResult = parseOptionsFromLines(content)
  if (lineResult.options.length >= 2) return lineResult
  return parseOptionsInline(content)
}

function parseOptionsFromLines(content: string): {
  before: string
  options: ParsedOption[]
  after: string
} {
  const lines = content.split('\n')
  let optionStartIdx = -1
  let optionEndIdx = -1
  const options: ParsedOption[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^([a-d])\)\s+(.+)/)
    if (match) {
      if (optionStartIdx === -1) optionStartIdx = i
      optionEndIdx = i
      options.push({ letter: match[1], text: match[2].trim() })
    } else if (optionStartIdx !== -1 && lines[i].trim() === '') {
      continue
    } else if (optionStartIdx !== -1) {
      break
    }
  }

  if (options.length < 2) {
    return { before: content, options: [], after: '' }
  }

  const before = lines.slice(0, optionStartIdx).join('\n').trimEnd()
  const after = lines.slice(optionEndIdx + 1).join('\n').trimStart()
  return { before, options, after }
}

function parseOptionsInline(content: string): {
  before: string
  options: ParsedOption[]
  after: string
} {
  const inlinePattern = /(?:^|\s)(a\)\s+.+?)\s+(b\)\s+.+?)(?:\s+(c\)\s+.+?))?(?:\s+(d\)\s+.+?))?$/m
  const paragraphs = content.split('\n\n')
  let matchParaIdx = -1
  let matchResult: RegExpMatchArray | null = null

  for (let i = paragraphs.length - 1; i >= 0; i--) {
    const normalized = paragraphs[i].replace(/\n/g, ' ')
    const match = normalized.match(inlinePattern)
    if (match) {
      matchParaIdx = i
      matchResult = match
      break
    }
  }

  if (!matchResult || matchParaIdx === -1) {
    return { before: content, options: [], after: '' }
  }

  const options: ParsedOption[] = []
  const rawOptions = [matchResult[1], matchResult[2], matchResult[3], matchResult[4]].filter(Boolean)

  for (const raw of rawOptions) {
    const optMatch = raw.match(/^([a-d])\)\s+(.+)/)
    if (optMatch) {
      options.push({ letter: optMatch[1], text: optMatch[2].trim() })
    }
  }

  if (options.length < 2) {
    return { before: content, options: [], after: '' }
  }

  const normalizedPara = paragraphs[matchParaIdx].replace(/\n/g, ' ')
  const optionStart = normalizedPara.indexOf(matchResult[1])
  const textBeforeInPara = normalizedPara.slice(0, optionStart).trimEnd()

  const beforeParts = [
    ...paragraphs.slice(0, matchParaIdx),
    ...(textBeforeInPara ? [textBeforeInPara] : []),
  ]
  const afterParts = paragraphs.slice(matchParaIdx + 1)

  return {
    before: beforeParts.join('\n\n').trimEnd(),
    options,
    after: afterParts.join('\n\n').trimStart(),
  }
}

const COLLAPSE_THRESHOLD = 500

export function ChatMessage({ role, content, isStreaming, isGenerating, isLastAssistant, onOptionClick }: ChatMessageProps) {
  const isUser = role === 'user'
  const isLong = isUser && content.length > COLLAPSE_THRESHOLD
  const [expanded, setExpanded] = useState(false)

  // Collapsed long user message
  if (isLong && !expanded) {
    const lineCount = content.split('\n').length
    const preview = content.slice(0, 80).split('\n')[0].trim()

    return (
      <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        <button
          onClick={() => setExpanded(true)}
          className="max-w-[80%] rounded-2xl rounded-br-lg bg-foreground px-4 py-3 text-left text-background transition-colors hover:bg-foreground/90"
        >
          <div className="flex items-start gap-2.5">
            <FileText className="mt-0.5 size-4 shrink-0 opacity-50" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{preview}</p>
              <p className="mt-0.5 text-xs opacity-50">{lineCount} lines</p>
            </div>
            <ChevronDown className="mt-0.5 size-3.5 shrink-0 opacity-50" />
          </div>
        </button>
      </div>
    )
  }

  // User message — dark bubble, right aligned
  if (isUser) {
    return (
      <div className="flex justify-end animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
        <div className="max-w-[80%] rounded-2xl rounded-br-lg bg-foreground px-4 py-2.5 text-[14px] leading-relaxed text-background">
          {isLong && expanded && (
            <button
              onClick={() => setExpanded(false)}
              className="mb-2 flex items-center gap-1 text-xs opacity-50 hover:opacity-80"
            >
              <ChevronUp className="size-3" />
              Collapse
            </button>
          )}
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    )
  }

  // Parse options from assistant content
  const showOptions = isLastAssistant && !isStreaming && onOptionClick
  const { before, options, after } = showOptions ? parseOptions(content) : { before: content, options: [], after: '' }

  const markdownComponents = {
    p: ({ children }: { children?: React.ReactNode }) => <p className="mb-3 last:mb-0">{children}</p>,
    strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-medium">{children}</strong>,
    em: ({ children }: { children?: React.ReactNode }) => <em>{children}</em>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="mb-3 ml-4 list-disc space-y-1.5 last:mb-0 marker:text-muted-foreground/40">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="mb-3 ml-4 list-decimal space-y-1.5 last:mb-0 marker:text-muted-foreground/40">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="pl-0.5">{children}</li>,
    h1: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 mt-4 font-medium first:mt-0">{children}</p>,
    h2: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 mt-4 font-medium first:mt-0">{children}</p>,
    h3: ({ children }: { children?: React.ReactNode }) => <p className="mb-1.5 mt-3 font-medium first:mt-0">{children}</p>,
    hr: () => <hr className="my-4 border-border/60" />,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
      <blockquote className="mb-3 border-l-2 border-border pl-3 text-muted-foreground last:mb-0">
        {children}
      </blockquote>
    ),
    code: ({ children }: { children?: React.ReactNode }) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-[13px]">{children}</code>
    ),
    a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-foreground/30 hover:decoration-foreground/60 transition-colors">
        {children}
      </a>
    ),
  }

  // Assistant message — clean typography, left aligned
  return (
    <div className={isStreaming ? '' : 'animate-in fade-in-0 slide-in-from-bottom-1 duration-300'}>
      {content ? (
        <div className="text-[14px] leading-[1.7] text-foreground">
          {before && (
            <Markdown components={markdownComponents}>
              {before}
            </Markdown>
          )}

          {/* Clickable option buttons */}
          {options.length > 0 && (
            <div className="my-4 flex flex-col gap-2">
              {options.map((opt) => (
                <button
                  key={opt.letter}
                  onClick={() => onOptionClick?.(opt.letter)}
                  className="group flex items-baseline gap-2.5 rounded-xl border border-border/80 px-3.5 py-2.5 text-left text-[14px] transition-all duration-150 hover:border-foreground/20 hover:bg-muted/40 hover:shadow-sm hover:-translate-y-px"
                >
                  <span className="shrink-0 font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                    {opt.letter})
                  </span>
                  <span className="text-foreground">{opt.text}</span>
                </button>
              ))}
            </div>
          )}

          {after && (
            <Markdown components={markdownComponents}>
              {after}
            </Markdown>
          )}

          {/* Generating proposal indicator */}
          {isGenerating && (
            <div className="mt-4 flex items-center gap-2.5 text-[13px] text-muted-foreground">
              <div className="size-3.5 animate-spin rounded-full border-[1.5px] border-muted-foreground/20 border-t-muted-foreground/70" />
              Building proposal...
            </div>
          )}
        </div>
      ) : isStreaming ? (
        <div className="flex items-center gap-1 py-3">
          <div
            className="size-2 rounded-full bg-foreground/70"
            style={{ animation: 'typing-dot 1.4s ease-in-out infinite' }}
          />
          <div
            className="size-2 rounded-full bg-foreground/70"
            style={{ animation: 'typing-dot 1.4s ease-in-out 0.2s infinite' }}
          />
          <div
            className="size-2 rounded-full bg-foreground/70"
            style={{ animation: 'typing-dot 1.4s ease-in-out 0.4s infinite' }}
          />
        </div>
      ) : null}
    </div>
  )
}
