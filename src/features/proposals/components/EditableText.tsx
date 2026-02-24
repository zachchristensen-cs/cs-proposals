import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface EditableTextProps {
  value: string
  onChange: (newValue: string) => void
  multiline?: boolean
  className?: string
  placeholder?: string
}

export function EditableText({
  value,
  onChange,
  multiline,
  className,
  placeholder = 'Click to edit...',
}: EditableTextProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function save() {
    setEditing(false)
    if (draft.trim() !== value) {
      onChange(draft.trim())
    }
  }

  function cancel() {
    setEditing(false)
    setDraft(value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      cancel()
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      save()
    }
  }

  if (editing) {
    const sharedProps = {
      ref: inputRef as any,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: save,
      onKeyDown: handleKeyDown,
      className: cn(
        'w-full rounded border border-ring bg-white px-2 py-1 text-inherit font-inherit leading-inherit outline-none',
        className,
      ),
    }

    return multiline ? (
      <textarea {...sharedProps} rows={3} />
    ) : (
      <input {...sharedProps} type="text" />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'cursor-pointer rounded transition-colors hover:bg-black/5',
        !value && 'text-[#6B6B6B] italic',
        className,
      )}
    >
      {value || placeholder}
    </span>
  )
}
