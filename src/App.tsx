import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { OrgProvider } from '@/contexts/OrgContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { AcceptInvitePage } from '@/features/auth/AcceptInvitePage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireRole } from '@/features/auth/RequireRole'
import { RequireOrg } from '@/features/auth/RequireOrg'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { AdminClientsPage } from '@/features/admin/AdminClientsPage'
import { AdminMaintenancePage } from '@/features/admin/AdminMaintenancePage'
import { AdminTicketDetailPage } from '@/features/admin/AdminTicketDetailPage'
import { AdminOrgDetailPage } from '@/features/admin/AdminOrgDetailPage'
import { AdminProjectsPage } from '@/features/admin/AdminProjectsPage'
import { AdminSettingsPage } from '@/features/admin/AdminSettingsPage'
import { MaintenancePage } from '@/features/maintenance/MaintenancePage'
import { TicketDetailPage } from '@/features/maintenance/TicketDetailPage'
import { ProjectsPage } from '@/features/projects/ProjectsPage'
import { AccountPage } from '@/features/account/AccountPage'

function Providers() {
  return (
    <AuthProvider>
      <OrgProvider>
        <Outlet />
      </OrgProvider>
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Providers />,
    children: [
      // Public routes (no layout)
      { path: '/login', element: <LoginPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/accept-invite', element: <AcceptInvitePage /> },

      // Protected routes (with layout)
      {
        element: <RequireAuth />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              // Client routes
              {
                element: <RequireRole role="client" />,
                children: [
                  {
                    element: <RequireOrg />,
                    children: [
                      { path: '/dashboard', element: <DashboardPage /> },
                      { path: '/dashboard/maintenance', element: <MaintenancePage /> },
                      { path: '/dashboard/maintenance/:id', element: <TicketDetailPage /> },
                      { path: '/dashboard/projects', element: <ProjectsPage /> },
                    ],
                  },
                ],
              },

              // Admin routes
              {
                element: <RequireRole role="admin" />,
                children: [
                  { path: '/admin', element: <AdminPage /> },
                  { path: '/admin/clients', element: <AdminClientsPage /> },
                  { path: '/admin/clients/:id', element: <AdminOrgDetailPage /> },
                  { path: '/admin/maintenance', element: <AdminMaintenancePage /> },
                  { path: '/admin/maintenance/:id', element: <AdminTicketDetailPage /> },
                  { path: '/admin/projects', element: <AdminProjectsPage /> },
                  { path: '/admin/settings', element: <AdminSettingsPage /> },
                ],
              },

              // Shared routes (any authenticated user)
              { path: '/account', element: <AccountPage /> },
            ],
          },
        ],
      },

      // Catch-all redirect
      { path: '*', element: <Navigate to="/login" replace /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
