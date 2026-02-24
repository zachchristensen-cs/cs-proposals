import { useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { useOrg } from '@/contexts/OrgContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TicketForm } from './components/TicketForm'
import { TicketList } from './components/TicketList'
import { MaintenanceSidebar } from './components/MaintenanceSidebar'

export function MaintenancePage() {
  const { activeOrg } = useOrg()
  const [activeTab, setActiveTab] = useState('submit')
  const [refreshKey, setRefreshKey] = useState(0)

  const limitReached =
    activeOrg != null &&
    activeOrg.tickets_used >= activeOrg.monthly_ticket_limit

  return (
    <PageWrapper title="Maintenance" description="Submit and track maintenance tickets">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main column */}
        <div className="min-w-0 flex-1 lg:flex-[2]">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="submit">Submit Ticket</TabsTrigger>
              <TabsTrigger value="tickets">My Tickets</TabsTrigger>
            </TabsList>

            <TabsContent value="submit" className="mt-4">
              {limitReached ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
                  <h3 className="mb-2 font-medium text-amber-900">
                    Monthly Limit Reached
                  </h3>
                  <p className="text-sm text-amber-700">
                    You&apos;ve used all {activeOrg?.monthly_ticket_limit} tickets for
                    this billing cycle. Your limit resets on the{' '}
                    {ordinal(activeOrg?.billing_cycle_day ?? 1)}.
                  </p>
                </div>
              ) : (
                <TicketForm
                  onSubmitted={() => {
                    setRefreshKey((k) => k + 1)
                    setActiveTab('tickets')
                  }}
                />
              )}
            </TabsContent>

            <TabsContent value="tickets" className="mt-4">
              <TicketList key={refreshKey} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="w-full shrink-0 lg:w-80">
          <MaintenanceSidebar refreshKey={refreshKey} />
        </div>
      </div>
    </PageWrapper>
  )
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
