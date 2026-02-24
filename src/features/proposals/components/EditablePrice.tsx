import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { formatCurrency } from '../lib/formatCurrency'

interface EditablePriceProps {
  value: number
  onChange: (newValue: number) => void
  className?: string
}

export function EditablePrice({ value, onChange, className }: EditablePriceProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(String(value))
  }, [value])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function save() {
    setEditing(false)
    const num = Number(draft)
    if (!isNaN(num) && num >= 0 && num !== value) {
      onChange(num)
    } else {
      setDraft(String(value))
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setEditing(false)
      setDraft(String(value))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      save()
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={0}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-24 rounded border border-ring bg-white px-2 py-1 text-right text-inherit font-inherit outline-none',
          className,
        )}
      />
    )
  }

  return (
    <span
      onClick={() => setEditing(true)}
      className={cn(
        'cursor-pointer rounded transition-colors hover:bg-black/5',
        className,
      )}
    >
      {formatCurrency(value)}
    </span>
  )
}
