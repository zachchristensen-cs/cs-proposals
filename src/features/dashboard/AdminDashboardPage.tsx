import { useAuth } from '@/contexts/AuthContext'
import { PageWrapper } from '@/components/layout/PageWrapper'

export function AdminDashboardPage() {
  const { user } = useAuth()
  const firstName = user?.email?.split('@')[0] ?? 'there'

  return (
    <PageWrapper title="Admin Dashboard" description={`Welcome back, ${firstName}`}>
      <div />
    </PageWrapper>
  )
}
