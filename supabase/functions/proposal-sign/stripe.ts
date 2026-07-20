// Stripe helpers for signing. Signing creates the customer and payment
// record; the embedded checkout session itself is created on demand by the
// proposal-pay function (so a reloaded page can always resume payment).
//
// Per-brand secret keys (the Ammo and Cambridge Stripe accounts live in the
// same Stripe *organization*, NOT a Connect platform, so the Stripe-Account
// header cannot be used — each brand needs its own API key):
//   STRIPE_SECRET_KEY   - Ammo account secret key (platform/default)
//   STRIPE_SK_AMMO      - optional override for the Ammo account
//   STRIPE_SK_CAMBRIDGE - Cambridge account secret key (required for
//                         Cambridge-brand proposals; we fail loudly rather
//                         than silently billing through the wrong account)

interface PaymentTerm {
  label: string
  amount: number
  description?: string
}

export interface StripeResult {
  customerId: string
  sessionId?: string
  subscriptionId?: string
  invoiceId?: string
  hostedInvoiceUrl?: string
  label: string
  amount: number
}

function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")
}

export function stripeKeyFor(brand: string): string {
  if (brand === "ammo") {
    const key = Deno.env.get("STRIPE_SK_AMMO") ?? Deno.env.get("STRIPE_SECRET_KEY")
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured")
    return key
  }
  const key = Deno.env.get("STRIPE_SK_CAMBRIDGE")
  if (!key) {
    throw new Error(
      "STRIPE_SK_CAMBRIDGE not configured - add the Cambridge account's secret key to the edge function secrets",
    )
  }
  return key
}

async function stripeRequest(
  path: string,
  params: Record<string, string>,
  brand: string,
  method = "POST",
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const key = stripeKeyFor(brand)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/x-www-form-urlencoded",
  }

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers,
    body: method === "GET" ? undefined : formEncode(params),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(`Stripe ${path}: ${data?.error?.message || res.status}`)
  }
  return data
}

/** Project proposals: create the customer for the first installment. */
export async function createFirstInstallmentInvoice(opts: {
  brand: string
  clientName: string
  signerEmail: string
  signerName: string
  terms: PaymentTerm[]
  proposalSlug: string
  origin: string
}): Promise<StripeResult> {
  const first = opts.terms[0]
  if (!first || !(first.amount > 0)) throw new Error("No payment terms with an amount")

  const customer = await stripeRequest("/customers", {
    email: opts.signerEmail,
    name: opts.clientName || opts.signerName,
    "metadata[proposal_slug]": opts.proposalSlug,
    "metadata[signer_name]": opts.signerName,
  }, opts.brand)

  return {
    customerId: customer.id,
    label: first.label,
    amount: first.amount,
  }
}

/** Retainer proposals: create the customer for the monthly subscription. */
export async function createRetainerSubscription(opts: {
  brand: string
  clientName: string
  signerEmail: string
  signerName: string
  monthlyAmount: number
  proposalSlug: string
  origin: string
}): Promise<StripeResult> {
  if (!(opts.monthlyAmount > 0)) throw new Error("No retainer amount")

  const customer = await stripeRequest("/customers", {
    email: opts.signerEmail,
    name: opts.clientName || opts.signerName,
    "metadata[proposal_slug]": opts.proposalSlug,
  }, opts.brand)

  return {
    customerId: customer.id,
    label: "Monthly Retainer",
    amount: opts.monthlyAmount,
  }
}
