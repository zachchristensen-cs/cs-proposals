import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const tools = [
  {
    title: 'Account',
    description: 'Update your profile and settings',
    icon: User,
    href: '/account',
  },
]

export function DashboardPage() {
  const { user } = useAuth()

  const fullName = (user?.user_metadata?.full_name as string) ?? ''
  const firstName = fullName.split(' ')[0] || user?.email?.split('@')[0] || 'there'

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="font-serif text-3xl tracking-tight">
        Welcome, {firstName}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        What would you like to work on?
      </p>

      <div className="mt-10 grid w-full max-w-sm gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            to={tool.href}
            className="group rounded-xl border p-6 transition hover:bg-muted/50"
          >
            <tool.icon className="size-5 text-muted-foreground transition group-hover:text-foreground" />
            <h2 className="mt-3 text-sm font-medium">{tool.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
