import { useCallback, useRef, useState } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { Upload, X, FileText, Film, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
]

const MAX_FILES = 5
const MAX_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024 // 50MB

function getMaxSize(type: string) {
  return type.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <ImageIcon className="size-4 text-blue-500" />
  if (type.startsWith('video/')) return <Film className="size-4 text-purple-500" />
  return <FileText className="size-4 text-orange-500" />
}

interface FileUploadProps {
  files: File[]
  onFilesChange: (files: File[]) => void
}

export function FileUpload({ files, onFilesChange }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndAddFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null)
      const toAdd: File[] = []

      for (const file of Array.from(newFiles)) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          setError(`Unsupported file type: ${file.name}`)
          continue
        }
        if (file.size > getMaxSize(file.type)) {
          const maxMB = getMaxSize(file.type) / (1024 * 1024)
          setError(`${file.name} exceeds ${maxMB}MB limit`)
          continue
        }
        toAdd.push(file)
      }

      const combined = [...files, ...toAdd]
      if (combined.length > MAX_FILES) {
        setError(`Maximum ${MAX_FILES} files allowed`)
        onFilesChange(combined.slice(0, MAX_FILES))
      } else {
        onFilesChange(combined)
      }
    },
    [files, onFilesChange],
  )

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (e.dataTransfer.files?.length) {
        validateAndAddFiles(e.dataTransfer.files)
      }
    },
    [validateAndAddFiles],
  )

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        validateAndAddFiles(e.target.files)
      }
      // Reset input so same file can be re-selected
      e.target.value = ''
    },
    [validateAndAddFiles],
  )

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index))
      setError(null)
    },
    [files, onFilesChange],
  )

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-md border-2 border-dashed px-4 py-6 text-center transition-colors',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          files.length >= MAX_FILES && 'pointer-events-none opacity-50',
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mb-2 size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Drag & drop files here, or{' '}
          <button
            type="button"
            className="text-primary underline"
            onClick={() => inputRef.current?.click()}
          >
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Images, PDFs, or videos. Max {MAX_FILES} files.
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleChange}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="size-10 rounded object-cover"
                />
              ) : (
                <div className="flex size-10 items-center justify-center rounded bg-muted">
                  <FileIcon type={file.type} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0"
                onClick={() => removeFile(i)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
