import { useAuth } from '@/contexts/AuthContext'
import { PageWrapper } from '@/components/layout/PageWrapper'

export function DashboardPage() {
  const { user } = useAuth()
  const firstName = user?.email?.split('@')[0] ?? 'there'

  return (
    <PageWrapper title="Dashboard" description={`Welcome back, ${firstName}`}>
      <div />
    </PageWrapper>
  )
}
