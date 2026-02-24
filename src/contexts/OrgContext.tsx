import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import type { Organization } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { useAuth } from './AuthContext'

const ACTIVE_ORG_KEY = 'cambridge_studio_active_org_id'

interface OrgContextValue {
  organizations: Organization[]
  activeOrg: Organization | null
  setActiveOrg: (id: string) => void
  refreshOrg: () => Promise<void>
  loading: boolean
}

const OrgContext = createContext<OrgContextValue | undefined>(undefined)

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)

  const setActiveOrg = useCallback(
    (id: string) => {
      const org = organizations.find((o) => o.id === id)
      if (org) {
        setActiveOrgState(org)
        localStorage.setItem(ACTIVE_ORG_KEY, id)
      }
    },
    [organizations],
  )

  const refreshOrg = useCallback(async () => {
    if (!activeOrg) return
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', activeOrg.id)
      .single()
    if (data) {
      const updated = data as Organization
      setActiveOrgState(updated)
      setOrganizations((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o)),
      )
    }
  }, [activeOrg])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setOrganizations([])
      setActiveOrgState(null)
      setLoading(false)
      return
    }

    async function fetchOrgs() {
      const { data } = await supabase
        .from('user_organizations')
        .select('organization_id, organizations(*)')
        .eq('user_id', user!.id)

      const orgs: Organization[] = (data ?? [])
        .map((row) => row.organizations as unknown as Organization)
        .filter(Boolean)

      setOrganizations(orgs)

      const savedId = localStorage.getItem(ACTIVE_ORG_KEY)
      const saved = orgs.find((o) => o.id === savedId)

      if (saved) {
        setActiveOrgState(saved)
      } else if (orgs.length === 1) {
        setActiveOrgState(orgs[0])
        localStorage.setItem(ACTIVE_ORG_KEY, orgs[0].id)
      } else {
        setActiveOrgState(null)
      }

      setLoading(false)
    }

    fetchOrgs()
  }, [user, authLoading])

  return (
    <OrgContext.Provider value={{ organizations, activeOrg, setActiveOrg, refreshOrg, loading }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const context = useContext(OrgContext)
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider')
  }
  return context
}
