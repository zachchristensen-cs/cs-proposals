import { useOrg } from '@/contexts/OrgContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function OrgSwitcher() {
  const { organizations, activeOrg, setActiveOrg } = useOrg()

  if (organizations.length < 2) {
    return null
  }

  return (
    <Select value={activeOrg?.id ?? ''} onValueChange={setActiveOrg}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select organization" />
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
