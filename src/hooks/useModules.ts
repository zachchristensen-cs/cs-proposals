import { useEffect, useState } from 'react'
import type { OrganizationModule } from '@/types/database'
import type { ModuleSlug } from '@/types/modules'
import { supabase } from '@/lib/supabase'
import { useOrg } from '@/contexts/OrgContext'

export function useModules() {
  const { activeOrg } = useOrg()
  const [modules, setModules] = useState<OrganizationModule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeOrg) {
      setModules([])
      setLoading(false)
      return
    }

    setLoading(true)

    supabase
      .from('organization_modules')
      .select('*')
      .eq('organization_id', activeOrg.id)
      .then(({ data }) => {
        setModules(data ?? [])
        setLoading(false)
      })
  }, [activeOrg])

  function hasModule(slug: ModuleSlug): boolean {
    return modules.some((m) => m.module_slug === slug && m.enabled)
  }

  return { modules, hasModule, loading }
}
