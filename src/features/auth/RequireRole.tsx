import { Navigate, Outlet } from 'react-router-dom'
import type { UserRole } from '@/types/modules'
import { useAuth } from '@/contexts/AuthContext'

export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!role || !roles.includes(role)) {
    const redirect = role === 'admin' || role === 'member' ? '/admin' : '/dashboard'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}
