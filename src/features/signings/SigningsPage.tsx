import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import type { ProposalContent } from '@/types/database'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/shared'
import { FileText } from 'lucide-react'
import { formatCurrency } from '../proposals/lib/formatCurrency'

interface SignatureRow {
  proposal_id: string
  first_name: string
  last_name: string
  email: string
  signature_type: string
  signed_at: string
}

interface PaymentRow {
  proposal_id: string
  brand: string
  amount: number
  label: string
  status: string
  hosted_invoice_url: string | null
  paid_at: string | null
  created_at: string
}

interface ProposalRow {
  id: string
  slug: string
  client_name: string | null
  status: string
  signed_at: string | null
  content: ProposalContent
}

interface CombinedRow {
  proposal: ProposalRow
  signature?: SignatureRow
  payment?: PaymentRow
}

const PAY_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  paid: 'default',
  sent: 'secondary',
  created: 'outline',
  void: 'outline',
  failed: 'outline',
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function SigningsPage() {
  const [rows, setRows] = useState<CombinedRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [propsRes, sigsRes, paysRes] = await Promise.all([
        supabase
          .from('proposals')
          .select('id, slug, client_name, status, signed_at, content')
          .order('signed_at', { ascending: false, nullsFirst: false }),
        supabase
          .from('proposal_signatures')
          .select('proposal_id, first_name, last_name, email, signature_type, signed_at'),
        supabase
          .from('proposal_payments')
          .select('proposal_id, brand, amount, label, status, hosted_invoice_url, paid_at, created_at')
          .order('created_at', { ascending: false }),
      ])

      const sigByProposal = new Map<string, SignatureRow>()
      for (const s of (sigsRes.data ?? []) as SignatureRow[]) {
        if (!sigByProposal.has(s.proposal_id)) sigByProposal.set(s.proposal_id, s)
      }
      // payments ordered newest-first; keep the most recent per proposal
      const payByProposal = new Map<string, PaymentRow>()
      for (const p of (paysRes.data ?? []) as PaymentRow[]) {
        if (!payByProposal.has(p.proposal_id)) payByProposal.set(p.proposal_id, p)
      }

      const combined: CombinedRow[] = ((propsRes.data ?? []) as ProposalRow[])
        .map((proposal) => ({
          proposal,
          signature: sigByProposal.get(proposal.id),
          payment: payByProposal.get(proposal.id),
        }))
        // Only surface proposals that have been signed or have a payment on file
        .filter((r) => r.proposal.status === 'signed' || r.signature || r.payment)

      setRows(combined)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <PageWrapper
      title="Signings & Payments"
      description="Who signed each proposal and the status of their payment. Live from the signature and payment records."
    >
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No signed proposals yet"
          description="Once a client signs a proposal, their signature and payment status will appear here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Signed by</TableHead>
              <TableHead>Signed on</TableHead>
              <TableHead>First payment</TableHead>
              <TableHead>Payment status</TableHead>
              <TableHead>Invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ proposal, signature, payment }) => {
              const brand = payment?.brand || proposal.content?.brand || 'cambridge'
              return (
                <TableRow key={proposal.id}>
                  <TableCell className="font-medium">
                    <Link className="hover:underline" to={`/admin/proposals/${proposal.id}`}>
                      {proposal.client_name || proposal.slug}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {brand === 'ammo' ? 'Ammo' : 'Cambridge'}
                  </TableCell>
                  <TableCell>
                    {signature ? (
                      <div className="leading-tight">
                        <div>{`${signature.first_name} ${signature.last_name}`.trim()}</div>
                        <div className="text-xs text-muted-foreground">{signature.email}</div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {fmtDate(signature?.signed_at ?? proposal.signed_at)}
                  </TableCell>
                  <TableCell>
                    {payment ? (
                      <span>
                        {formatCurrency(Number(payment.amount))}
                        {payment.label ? (
                          <span className="text-muted-foreground"> · {payment.label}</span>
                        ) : null}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment ? (
                      <Badge variant={PAY_VARIANT[payment.status] ?? 'outline'} className="capitalize">
                        {payment.status === 'paid' ? 'Paid' : payment.status}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {payment?.hosted_invoice_url ? (
                      <a
                        className="text-sm text-blue-600 hover:underline"
                        href={payment.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </PageWrapper>
  )
}
