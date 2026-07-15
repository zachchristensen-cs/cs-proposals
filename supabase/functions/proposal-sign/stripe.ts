// Minimal Stripe REST helpers (no SDK). Uses the platform secret key and,
// when configured, routes to the brand's connected account via the
// Stripe-Account header:
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
  invoiceId?: string
  subscriptionId?: string
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
 * Project proposals: create + send a Stripe invoice for the FIRST payment
 * installment (e.g. "Kickoff - 50%"). Later installments are invoiced when due.
 */
export async function createFirstInstallmentInvoice(opts: {
  brand: string
  clientName: string
  signerEmail: string
  signerName: string
  terms: PaymentTerm[]
  proposalSlug: string
}): Promise<StripeResult> {
  const first = opts.terms[0]
  if (!first || !(first.amount > 0)) throw new Error("No payment terms with an amount")

  const customer = await stripeRequest("/customers", {
    email: opts.signerEmail,
    name: opts.clientName || opts.signerName,
    "metadata[proposal_slug]": opts.proposalSlug,
    "metadata[signer_name]": opts.signerName,
  }, opts.brand)

  const invoice = await stripeRequest("/invoices", {
    customer: customer.id,
    collection_method: "send_invoice",
    days_until_due: "7",
    description: `${opts.clientName} - ${first.label}`,
    "metadata[proposal_slug]": opts.proposalSlug,
    "metadata[installment]": first.label,
    auto_advance: "true",
  }, opts.brand)

  await stripeRequest("/invoiceitems", {
    customer: customer.id,
    invoice: invoice.id,
    amount: String(Math.round(first.amount * 100)),
    currency: "usd",
    description: `${first.label}${first.description ? ` - ${first.description}` : ""}`,
  }, opts.brand)

  const finalized = await stripeRequest(`/invoices/${invoice.id}/finalize`, {}, opts.brand)
  await stripeRequest(`/invoices/${invoice.id}/send`, {}, opts.brand)

  return {
    customerId: customer.id,
    invoiceId: invoice.id,
    hostedInvoiceUrl: finalized.hosted_invoice_url,
    label: first.label,
    amount: first.amount,
  }
}

/**
 * Retainer proposals: create an invoice-based monthly subscription for the
 * full recurring amount. Stripe emails an invoice each cycle.
 */
export async function createRetainerSubscription(opts: {
  brand: string
  clientName: string
  signerEmail: string
  signerName: string
  monthlyAmount: number
  proposalSlug: string
}): Promise<StripeResult> {
  if (!(opts.monthlyAmount > 0)) throw new Error("No retainer amount")

  const customer = await stripeRequest("/customers", {
    email: opts.signerEmail,
    name: opts.clientName || opts.signerName,
    "metadata[proposal_slug]": opts.proposalSlug,
  }, opts.brand)

  const product = await stripeRequest("/products", {
    name: `${opts.clientName} - Monthly Retainer`,
    "metadata[proposal_slug]": opts.proposalSlug,
  }, opts.brand)

  const price = await stripeRequest("/prices", {
    product: product.id,
    unit_amount: String(Math.round(opts.monthlyAmount * 100)),
    currency: "usd",
    "recurring[interval]": "month",
  }, opts.brand)

  const subscription = await stripeRequest("/subscriptions", {
    customer: customer.id,
    "items[0][price]": price.id,
    collection_method: "send_invoice",
    days_until_due: "7",
    "metadata[proposal_slug]": opts.proposalSlug,
  }, opts.brand)

  let hostedInvoiceUrl: string | undefined
  let invoiceId: string | undefined
  if (subscription.latest_invoice) {
    invoiceId = subscription.latest_invoice
    const invoice = await stripeRequest(`/invoices/${subscription.latest_invoice}`, {}, opts.brand, "GET")
    hostedInvoiceUrl = invoice.hosted_invoice_url
  }

  return {
    customerId: customer.id,
    subscriptionId: subscription.id,
    invoiceId,
    hostedInvoiceUrl,
    label: "Monthly Retainer",
    amount: opts.monthlyAmount,
  }
}
