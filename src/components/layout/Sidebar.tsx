import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useSidebar } from './SidebarContext'
import { OrgSwitcher } from './OrgSwitcher'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import cambridgeLogo from '@/assets/CambridgeStudio Logo.svg'

interface SidebarProps {
  onNavigate?: () => void
}

function SidebarLink({
  to,
  icon: Icon,
  children,
  collapsed,
  onNavigate,
}: {
  to: string
  icon: typeof LayoutDashboard
  children: string
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const link = (
    <NavLink
      to={to}
      end
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-150',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-foreground/[0.06] font-medium text-foreground'
            : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground',
        )
      }
    >
      <Icon className="size-[15px] shrink-0" strokeWidth={1.75} />
      {!collapsed && (
        <>
          <span className="flex-1">{children}</span>
          <ChevronRight className="size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
        </>
      )}
    </NavLink>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {children}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { user, role, isAgencyStaff, signOut } = useAuth()
  const { collapsed, toggle } = useSidebar()
  const navigate = useNavigate()

  // In mobile overlay, always show expanded
  const isCollapsed = onNavigate ? false : collapsed

  return (
    <div className="flex h-full flex-col">
      {/* Workspace area */}
      <div className={cn('px-3 pb-2 pt-3', isCollapsed && 'px-1.5')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-foreground/[0.04]',
                isCollapsed && 'justify-center px-0',
              )}
            >
              <img
                src={cambridgeLogo}
                alt="Cambridge Studio"
                className="size-[26px] shrink-0"
              />
              {!isCollapsed && (
                <>
                  <span className="flex-1 truncate text-left text-[13px] font-medium">
                    Cambridge Studio
                  </span>
                  <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side={isCollapsed ? 'right' : 'bottom'}
            sideOffset={isCollapsed ? 12 : 4}
            className="w-56"
          >
            {isAgencyStaff && (
              <DropdownMenuItem
                onClick={() => {
                  navigate('/admin/team')
                  onNavigate?.()
                }}
              >
                <Users className="mr-2 size-4" />
                Team
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => {
                navigate('/account')
                onNavigate?.()
              }}
            >
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={signOut}
              className="text-muted-foreground"
            >
              <LogOut className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex-1 space-y-0.5 overflow-y-auto px-3',
          isCollapsed && 'px-1.5',
        )}
      >
        {role === 'client' && (
          <SidebarLink
            to="/dashboard"
            icon={LayoutDashboard}
            collapsed={isCollapsed}
            onNavigate={onNavigate}
          >
            Dashboard
          </SidebarLink>
        )}

        {isAgencyStaff && (
          <>
            <SidebarLink
              to="/admin"
              icon={LayoutDashboard}
              collapsed={isCollapsed}
              onNavigate={onNavigate}
            >
              Dashboard
            </SidebarLink>
            <SidebarLink
              to="/admin/proposals"
              icon={FileText}
              collapsed={isCollapsed}
              onNavigate={onNavigate}
            >
              Proposals
            </SidebarLink>
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className={cn('px-3 pb-3', isCollapsed && 'px-1.5')}>
        {!isCollapsed && <OrgSwitcher />}

        {/* User email */}
        {!isCollapsed && (
          <div className="mt-2 border-t border-border/60 px-2 pt-2">
            <p className="truncate text-[11px] text-muted-foreground/60">
              {user?.email}
            </p>
          </div>
        )}

        {/* Collapse toggle (desktop only) */}
        {!onNavigate && (
          <div
            className={cn(
              'mt-2',
              !isCollapsed && 'border-t border-border/60 pt-2',
            )}
          >
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggle}
                    className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground/60 transition-colors hover:bg-foreground/[0.04] hover:text-muted-foreground"
                  >
                    <ChevronsRight
                      className="size-[15px]"
                      strokeWidth={1.75}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  Expand sidebar
                </TooltipContent>
              </Tooltip>
            ) : (
              <button
                onClick={toggle}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted-foreground/60 transition-colors hover:bg-foreground/[0.04] hover:text-muted-foreground"
              >
                <ChevronsLeft
                  className="size-[15px] shrink-0"
                  strokeWidth={1.75}
                />
                <span className="flex-1 text-left">Collapse</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
