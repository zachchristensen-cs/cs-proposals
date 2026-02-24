import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { SidebarProvider, useSidebar } from './SidebarContext'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { collapsed } = useSidebar()

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden shrink-0 border-r border-border/60 bg-[#faf9f7] transition-all duration-200 lg:block',
          collapsed ? 'w-[52px]' : 'w-56',
        )}
      >
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={closeSidebar}
          />
          {/* Sidebar panel */}
          <aside
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-56 border-r border-border/60 bg-[#faf9f7] shadow-lg',
              'animate-in slide-in-from-left duration-200',
            )}
          >
            <Sidebar onNavigate={closeSidebar} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function DashboardLayout() {
  return (
    <SidebarProvider>
      <TooltipProvider>
        <Layout />
      </TooltipProvider>
    </SidebarProvider>
  )
}
