import { Outlet } from 'react-router-dom'
import { useOrg } from '@/contexts/OrgContext'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export function RequireOrg() {
  const { organizations, activeOrg, setActiveOrg, loading } = useOrg()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!activeOrg) {
    if (organizations.length === 0) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <h1 className="font-serif text-2xl tracking-tight">Cambridge Studio</h1>
              <p className="text-sm text-muted-foreground">
                No organization found
              </p>
            </CardHeader>
            <CardContent className="text-center text-sm text-muted-foreground">
              You haven't been added to an organization yet. Please contact your administrator.
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <h1 className="font-serif text-2xl tracking-tight">Cambridge Studio</h1>
            <p className="text-sm text-muted-foreground">
              Select an organization
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {organizations.map((org) => (
              <Button
                key={org.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => setActiveOrg(org.id)}
              >
                {org.name}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return <Outlet />
}
