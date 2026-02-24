import type { ReactNode } from 'react'

interface PageWrapperProps {
  title: string
  description?: string
  children: ReactNode
}

export function PageWrapper({ title, description, children }: PageWrapperProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  )
}
