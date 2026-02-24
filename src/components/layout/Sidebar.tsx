import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, Users, Settings, LogOut, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { OrgSwitcher } from './OrgSwitcher'
import cambridgeLogo from '@/assets/CambridgeStudio Logo.svg'

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
  icon: typeof LayoutDashboard
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
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-150',
          isActive
            ? 'bg-foreground/[0.06] text-foreground font-medium'
            : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
        )
      }
    >
      <Icon className="size-[15px] shrink-0" strokeWidth={1.75} />
      <span className="flex-1">{children}</span>
      <ChevronRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
    </NavLink>
  )
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, role, signOut } = useAuth()

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 pb-3 pt-5">
        <img src={cambridgeLogo} alt="Cambridge Studio" className="size-[30px]" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
        {role === 'client' && (
          <SidebarLink to="/dashboard" icon={LayoutDashboard} onNavigate={onNavigate}>
            Dashboard
          </SidebarLink>
        )}

        {(role === 'admin' || role === 'member') && (
          <>
            <SidebarLink to="/admin" icon={LayoutDashboard} onNavigate={onNavigate}>
              Dashboard
            </SidebarLink>
            <SidebarLink to="/admin/proposals" icon={FileText} onNavigate={onNavigate}>
              Proposals
            </SidebarLink>
            <SidebarLink to="/admin/team" icon={Users} onNavigate={onNavigate}>
              Team
            </SidebarLink>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4">
        <OrgSwitcher />

        {/* Account & Sign Out */}
        <div className="mt-2 space-y-0.5">
          <SidebarLink to="/account" icon={Settings} onNavigate={onNavigate}>
            Settings
          </SidebarLink>

          <button
            onClick={signOut}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-all duration-150 hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <LogOut className="size-[15px] shrink-0" strokeWidth={1.75} />
            <span className="flex-1 text-left">Sign Out</span>
          </button>
        </div>

        {/* User email */}
        <div className="mt-3 border-t pt-3 px-3">
          <p className="truncate text-[11px] text-muted-foreground/60">{user?.email}</p>
        </div>
      </div>
    </div>
  )
}
