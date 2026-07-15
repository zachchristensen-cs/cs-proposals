// Stripe helpers for signing. Signing creates the customer and payment
// record; the embedded checkout session itself is created on demand by the
// proposal-pay function (so a reloaded page can always resume payment).
//   STRIPE_SECRET_KEY            - platform secret key (required)
//   STRIPE_ACCOUNT_CAMBRIDGE     - optional acct_... connected account id
//   STRIPE_ACCOUNT_AMMO          - optional acct_... connected account id

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

async function stripeRequest(
  path: string,
  params: Record<string, string>,
  brand: string,
  method = "POST",
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  const key = Deno.env.get("STRIPE_SECRET_KEY")
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured")

  const account = brand === "ammo"
    ? Deno.env.get("STRIPE_ACCOUNT_AMMO")
    : Deno.env.get("STRIPE_ACCOUNT_CAMBRIDGE")

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/x-www-form-urlencoded",
  }
  if (account) headers["Stripe-Account"] = account

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
