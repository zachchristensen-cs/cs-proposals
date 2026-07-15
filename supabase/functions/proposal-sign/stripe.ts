// Stripe Checkout helpers (REST, no SDK). Signing flows straight into a
// Checkout session: projects pay the first installment immediately;
// retainers start a monthly subscription. Uses the platform secret key and,
// when configured, routes to the brand's connected account:
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
  /** Checkout URL the signer is sent to right after signing */
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

/**
 * Project proposals: Checkout session for the FIRST payment installment
 * (e.g. "Kickoff - 50%"). Later installments are invoiced when due.
 */
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

  const session = await stripeRequest("/checkout/sessions", {
    mode: "payment",
    customer: customer.id,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(first.amount * 100)),
    "line_items[0][price_data][product_data][name]": `${opts.clientName} - ${first.label}`,
    "line_items[0][quantity]": "1",
    "invoice_creation[enabled]": "true",
    success_url: `${opts.origin}/p/${opts.proposalSlug}?payment=success`,
    cancel_url: `${opts.origin}/p/${opts.proposalSlug}?payment=cancelled`,
    "metadata[proposal_slug]": opts.proposalSlug,
    "metadata[installment]": first.label,
  }, opts.brand)

  return {
    customerId: customer.id,
    sessionId: session.id,
    hostedInvoiceUrl: session.url,
    label: first.label,
    amount: first.amount,
  }
}

/**
 * Retainer proposals: Checkout session that starts a monthly subscription
 * for the full recurring amount.
 */
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

  const session = await stripeRequest("/checkout/sessions", {
    mode: "subscription",
    customer: customer.id,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(opts.monthlyAmount * 100)),
    "line_items[0][price_data][recurring][interval]": "month",
    "line_items[0][price_data][product_data][name]": `${opts.clientName} - Monthly Retainer`,
    "line_items[0][quantity]": "1",
    success_url: `${opts.origin}/p/${opts.proposalSlug}?payment=success`,
    cancel_url: `${opts.origin}/p/${opts.proposalSlug}?payment=cancelled`,
    "metadata[proposal_slug]": opts.proposalSlug,
  }, opts.brand)

  return {
    customerId: customer.id,
    sessionId: session.id,
    hostedInvoiceUrl: session.url,
    label: "Monthly Retainer",
    amount: opts.monthlyAmount,
  }
}
