import { Link } from 'react-router-dom'
import { Wrench, FolderKanban } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { useModules } from '@/hooks/useModules'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function DashboardPage() {
  const { user } = useAuth()
  const { activeOrg } = useOrg()
  const { hasModule } = useModules()

  const firstName = user?.email?.split('@')[0] ?? 'there'

  return (
    <PageWrapper title="Dashboard" description={`Welcome back, ${firstName}`}>
      <div className="grid gap-4 sm:grid-cols-2">
        {hasModule('maintenance') && activeOrg && (
          <Link to="/dashboard/maintenance" className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-md bg-blue-50 p-2">
                  <Wrench className="size-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium">Maintenance</h3>
                  <p className="text-sm text-muted-foreground">
                    Submit and track requests
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {activeOrg.tickets_used} / {activeOrg.monthly_ticket_limit} tickets used this month
                </p>
              </CardContent>
            </Card>
          </Link>
        )}

        {hasModule('projects') && (
          <Link to="/dashboard/projects" className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className="rounded-md bg-purple-50 p-2">
                  <FolderKanban className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-medium">Projects</h3>
                  <p className="text-sm text-muted-foreground">
                    View your active projects
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View project status and deliverables
                </p>
              </CardContent>
            </Card>
          </Link>
        )}
      </div>
    </PageWrapper>
  )
}
