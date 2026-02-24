import type { ReactNode } from 'react'

interface PageWrapperProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function PageWrapper({ title, description, action, children }: PageWrapperProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
