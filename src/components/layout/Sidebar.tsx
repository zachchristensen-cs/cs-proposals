import { NavLink } from 'react-router-dom'
import {
  Home,
  LayoutDashboard,
  Wrench,
  FolderKanban,
  Building2,
  Settings,
  User,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useModules } from '@/hooks/useModules'
import { OrgSwitcher } from './OrgSwitcher'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
  onNavigate?: () => void
}

function SidebarLink({
  to,
  icon: Icon,
  children,
  onNavigate,
}: {
  to: string
  icon: typeof Home
  children: string
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        )
      }
    >
      <Icon className="size-4 shrink-0" />
      {children}
    </NavLink>
  )
}

function SidebarSection({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </div>
      {children}
    </div>
  )
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, role, signOut } = useAuth()
  const { hasModule } = useModules()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="px-4 py-5">
        <h1 className="font-serif text-lg tracking-tight">Cambridge Studio</h1>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {role === 'client' && (
          <>
            <SidebarLink to="/dashboard" icon={Home} onNavigate={onNavigate}>
              Dashboard
            </SidebarLink>

            {hasModule('maintenance') && (
              <SidebarSection label="Maintenance">
                <SidebarLink to="/dashboard/maintenance" icon={Wrench} onNavigate={onNavigate}>
                  Maintenance
                </SidebarLink>
              </SidebarSection>
            )}

            {hasModule('projects') && (
              <SidebarSection label="Projects">
                <SidebarLink to="/dashboard/projects" icon={FolderKanban} onNavigate={onNavigate}>
                  My Projects
                </SidebarLink>
              </SidebarSection>
            )}
          </>
        )}

        {role === 'admin' && (
          <>
            <SidebarLink to="/admin" icon={LayoutDashboard} onNavigate={onNavigate}>
              Dashboard
            </SidebarLink>
            <SidebarLink to="/admin/clients" icon={Building2} onNavigate={onNavigate}>
              Clients
            </SidebarLink>
            <SidebarLink to="/admin/maintenance" icon={Wrench} onNavigate={onNavigate}>
              Maintenance
            </SidebarLink>
            <SidebarLink to="/admin/projects" icon={FolderKanban} onNavigate={onNavigate}>
              Projects
            </SidebarLink>
            <SidebarLink to="/admin/settings" icon={Settings} onNavigate={onNavigate}>
              Settings
            </SidebarLink>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="space-y-3 px-3 pb-4">
        <OrgSwitcher />

        <Separator />

        <SidebarLink to="/account" icon={User} onNavigate={onNavigate}>
          Account
        </SidebarLink>

        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          Sign Out
        </button>

        <div className="px-3 pt-1">
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
      </div>
    </div>
  )
}
