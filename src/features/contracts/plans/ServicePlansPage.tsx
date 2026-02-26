import { useEffect, useState } from 'react'
import { PageWrapper } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { Clock, Phone, DollarSign, Pencil } from 'lucide-react'
import type { ServicePlan } from '@/types/database'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default function ServicePlansPage() {
  const [plans, setPlans] = useState<ServicePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<ServicePlan | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formMonthlyRate, setFormMonthlyRate] = useState('')
  const [formAnnualRate, setFormAnnualRate] = useState('')
  const [formServiceHours, setFormServiceHours] = useState('')
  const [formStrategyCall, setFormStrategyCall] = useState(false)
  const [formOverageRate, setFormOverageRate] = useState('')
  const [formActive, setFormActive] = useState(true)

  async function fetchPlans() {
    const { data, error } = await supabase
      .from('service_plans')
      .select('*')
      .order('monthly_rate')

    if (error) {
      toast.error('Failed to load service plans')
      return
    }

    setPlans(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  function openEditDialog(plan: ServicePlan) {
    setEditingPlan(plan)
    setFormName(plan.name)
    setFormDescription(plan.description ?? '')
    setFormMonthlyRate((plan.monthly_rate / 100).toFixed(2))
    setFormAnnualRate((plan.annual_rate / 100).toFixed(2))
    setFormServiceHours(String(plan.service_hours))
    setFormStrategyCall(plan.includes_strategy_call)
    setFormOverageRate(((plan.overage_rate ?? 0) / 100).toFixed(2))
    setFormActive(plan.is_active)
    setDialogOpen(true)
  }

  async function handleToggleActive(plan: ServicePlan) {
    const newActive = !plan.is_active
    const { error } = await supabase
      .from('service_plans')
      .update({ is_active: newActive })
      .eq('id', plan.id)

    if (error) {
      toast.error('Failed to update plan status')
      return
    }

    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, is_active: newActive } : p))
    )
    toast.success(`${plan.name} ${newActive ? 'activated' : 'deactivated'}`)
  }

  async function handleSave() {
    if (!editingPlan) return

    const monthlyRateCents = Math.round(parseFloat(formMonthlyRate) * 100)
    const annualRateCents = Math.round(parseFloat(formAnnualRate) * 100)
    const overageRateCents = Math.round(parseFloat(formOverageRate) * 100)
    const serviceHours = parseInt(formServiceHours, 10)

    if (isNaN(monthlyRateCents) || isNaN(annualRateCents) || isNaN(serviceHours)) {
      toast.error('Please enter valid numbers for rates and hours')
      return
    }

    if (annualRateCents >= monthlyRateCents * 12) {
      toast.error('Annual rate should be less than monthly rate × 12 (it represents a discount)')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('service_plans')
      .update({
        name: formName,
        description: formDescription || null,
        monthly_rate: monthlyRateCents,
        annual_rate: annualRateCents,
        service_hours: serviceHours,
        includes_strategy_call: formStrategyCall,
        overage_rate: overageRateCents,
        is_active: formActive,
      })
      .eq('id', editingPlan.id)

    setSaving(false)

    if (error) {
      toast.error('Failed to save plan')
      return
    }

    toast.success('Plan updated')
    setDialogOpen(false)
    fetchPlans()
  }

  return (
    <PageWrapper title="Service Plans" description="Configure hosting and maintenance plan pricing.">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading plans...
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="relative cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openEditDialog(plan)}
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  {!plan.is_active && (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={plan.is_active}
                    onCheckedChange={() => handleToggleActive(plan)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEditDialog(plan)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-2xl font-bold">{formatCents(plan.monthly_rate)}</span>
                      <span className="text-sm text-muted-foreground">/month</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>{formatCents(plan.annual_rate)}/year</span>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{plan.service_hours} service hours/month</span>
                  </div>

                  {plan.includes_strategy_call && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">Strategy Call Included</Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update the details for {editingPlan?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plan-description">Description</Label>
              <textarea
                id="plan-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-monthly">Monthly Rate ($)</Label>
                <Input
                  id="plan-monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formMonthlyRate}
                  onChange={(e) => setFormMonthlyRate(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="plan-annual">Annual Rate ($)</Label>
                <Input
                  id="plan-annual"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formAnnualRate}
                  onChange={(e) => setFormAnnualRate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="plan-hours">Service Hours/Month</Label>
                <Input
                  id="plan-hours"
                  type="number"
                  min="0"
                  value={formServiceHours}
                  onChange={(e) => setFormServiceHours(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="plan-overage">Overage Rate ($)</Label>
                <Input
                  id="plan-overage"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formOverageRate}
                  onChange={(e) => setFormOverageRate(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="plan-strategy" className="cursor-pointer">
                Includes Strategy Call
              </Label>
              <Switch
                id="plan-strategy"
                checked={formStrategyCall}
                onCheckedChange={setFormStrategyCall}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="plan-active" className="cursor-pointer">
                Active
              </Label>
              <Switch
                id="plan-active"
                checked={formActive}
                onCheckedChange={setFormActive}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
