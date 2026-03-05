import { RouterProvider, createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { AcceptInvitePage } from '@/features/auth/AcceptInvitePage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { RequireRole } from '@/features/auth/RequireRole'
import { AdminDashboardPage } from '@/features/dashboard/AdminDashboardPage'
import { AccountPage } from '@/features/account/AccountPage'
import { ProposalsPage, NewProposalPage, EditProposalPage, PublicProposalPage } from '@/features/proposals'
import { TeamPage } from '@/features/team'
import { Toaster } from 'sonner'

function Providers() {
  return (
    <AuthProvider>
      <Outlet />
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
      { path: '/p/:slug', element: <PublicProposalPage /> },

      // Protected routes (with layout)
      {
        element: <RequireAuth />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              {
                element: <RequireRole roles={['admin', 'member']} />,
                children: [
                  { path: '/admin', element: <AdminDashboardPage /> },
                  { path: '/admin/proposals', element: <ProposalsPage /> },
                  { path: '/admin/proposals/new', element: <NewProposalPage /> },
                  { path: '/admin/proposals/:id', element: <EditProposalPage /> },
                  { path: '/admin/team', element: <TeamPage /> },
                ],
              },

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
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" />
    </>
  )
}
