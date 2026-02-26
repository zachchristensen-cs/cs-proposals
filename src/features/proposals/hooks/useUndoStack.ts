import { useRef, useCallback } from 'react'
import type { ProposalContent } from '@/types/database'

const MAX_UNDO = 30

export function useUndoStack() {
  const undoStack = useRef<ProposalContent[]>([])
  const redoStack = useRef<ProposalContent[]>([])

  /** Push a snapshot of the *previous* state before applying a change */
  const pushUndo = useCallback((snapshot: ProposalContent) => {
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO - 1)), snapshot]
    // Any new edit clears the redo stack
    redoStack.current = []
  }, [])

  /** Pop the last undo snapshot, pushing current state onto redo */
  const popUndo = useCallback((current: ProposalContent): ProposalContent | null => {
    if (undoStack.current.length === 0) return null
    const previous = undoStack.current[undoStack.current.length - 1]
    undoStack.current = undoStack.current.slice(0, -1)
    redoStack.current = [...redoStack.current, current]
    return previous
  }, [])

  /** Pop the last redo snapshot, pushing current state onto undo */
  const popRedo = useCallback((current: ProposalContent): ProposalContent | null => {
    if (redoStack.current.length === 0) return null
    const next = redoStack.current[redoStack.current.length - 1]
    redoStack.current = redoStack.current.slice(0, -1)
    undoStack.current = [...undoStack.current, current]
    return next
  }, [])

  const canUndo = useCallback(() => undoStack.current.length > 0, [])
  const canRedo = useCallback(() => redoStack.current.length > 0, [])

  return { pushUndo, popUndo, popRedo, canUndo, canRedo }
}
