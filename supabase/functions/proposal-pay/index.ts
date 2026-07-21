import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// Embedded checkout for signed proposals. Deployed with --no-verify-jwt.
// POST { slug } ->
//   { paid: true }                                     when already paid
//   { paid: false, client_secret, publishable_key,
//     stripe_account, amount, label }                  to mount embedded checkout
// Creates a fresh embedded Checkout session each time (they expire in 24h),
// reusing the customer created at signing. Card + ACH debit always; US bank
// transfer (wire) is requested too and dropped automatically if the Stripe
// account doesn't have it enabled.
//
// Per-brand secret keys (the Ammo and Cambridge Stripe accounts live in the
// same Stripe *organization*, NOT a Connect platform, so the Stripe-Account
// header cannot be used — each brand needs its own API key):
//   STRIPE_SECRET_KEY   - Ammo account secret key (platform/default)
//   STRIPE_SK_AMMO      - optional override for the Ammo account
//   STRIPE_SK_CAMBRIDGE - Cambridge account secret key (required for
//                         Cambridge-brand proposals)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function formEncode(params: Record<string, string>): string {
  return Object.entries(params)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&")
}

function stripeKeyFor(brand: string): string {
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
    // embedded_page checkout requires this API version or newer
    "Stripe-Version": "2026-03-25.dahlia",
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

// Create a checkout session, adapting to the account's Stripe API version:
// newer API versions renamed ui_mode "embedded" to "embedded_page".
async function createSession(
  params: Record<string, string>,
  brand: string,
  // deno-lint-ignore no-explicit-any
): Promise<any> {
  try {
    return await stripeRequest("/checkout/sessions", params, brand)
  } catch (err) {
    if (String(err).includes("embedded_page")) {
      return await stripeRequest(
        "/checkout/sessions",
        { ...params, "ui_mode": "embedded_page" },
        brand,
      )
    }
    throw err
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  // deno-lint-ignore no-explicit-any
  let body: any
  try {
    body = JSON.parse(await req.text())
  } catch {
    return json({ error: "Invalid JSON" }, 400)
  }

  const slug = typeof body?.slug === "string" ? body.slug : ""
  if (!slug) return json({ error: "slug required" }, 400)

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, slug, status, client_name, content, signed_at")
    .eq("slug", slug)
    .single()

  if (!proposal) return json({ error: "Not found" }, 404)
  if (!proposal.signed_at && proposal.status !== "signed") {
    return json({ error: "Proposal is not signed yet" }, 409)
  }

  const { data: payment } = await supabase
    .from("proposal_payments")
    .select("*")
    .eq("proposal_id", proposal.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!payment) return json({ error: "No payment is set up for this proposal" }, 404)
  if (payment.status === "paid") return json({ paid: true })

  const brand: string = payment.brand === "ammo" ? "ammo" : "cambridge"

  // If a session already exists, check whether it was paid
  if (payment.stripe_checkout_session_id) {
    try {
      const prior = await stripeRequest(
        `/checkout/sessions/${payment.stripe_checkout_session_id}`,
        {},
        brand,
        "GET",
      )
      if (prior?.payment_status === "paid" || prior?.status === "complete") {
        await supabase
          .from("proposal_payments")
          .update({ status: "paid", paid_at: new Date().toISOString() })
          .eq("id", payment.id)
        return json({ paid: true })
      }
    } catch (err) {
      console.error("session lookup failed:", err)
    }
  }

  const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || ""
  const isRetainer = String(payment.label ?? "").includes("Retainer")
  // deno-lint-ignore no-explicit-any
  const content: any = proposal.content ?? {}
  const retainerInterval = String(content.retainer_interval ?? "monthly")
  const cents = String(Math.round(Number(payment.amount) * 100))
  const productName = `${proposal.client_name || proposal.slug} - ${payment.label}`

  const base: Record<string, string> = {
    "ui_mode": "embedded_page",
    customer: payment.stripe_customer_id,
    return_url: `${origin}/p/${proposal.slug}?payment=success`,
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": cents,
    "line_items[0][price_data][product_data][name]": productName,
    "line_items[0][quantity]": "1",
    "metadata[proposal_slug]": proposal.slug,
  }

  // deno-lint-ignore no-explicit-any
  let session: any
  if (isRetainer) {
    // monthly / quarterly / semiannual / annual billing cadence
    const recurring: Record<string, string> =
      retainerInterval === "annual"
        ? { "line_items[0][price_data][recurring][interval]": "year" }
        : {
            "line_items[0][price_data][recurring][interval]": "month",
            "line_items[0][price_data][recurring][interval_count]":
              retainerInterval === "quarterly" ? "3" : retainerInterval === "semiannual" ? "6" : "1",
          }
    session = await createSession({
      ...base,
      mode: "subscription",
      ...recurring,
    }, brand)
  } else {
    // Try to include US bank transfer (wire) alongside card + ACH debit;
    // fall back to the account's default methods if it isn't enabled.
    const withWire: Record<string, string> = {
      ...base,
      mode: "payment",
      "invoice_creation[enabled]": "true",
      "payment_method_types[0]": "card",
      "payment_method_types[1]": "us_bank_account",
      "payment_method_types[2]": "customer_balance",
      "payment_method_options[customer_balance][funding_type]": "bank_transfer",
      "payment_method_options[customer_balance][bank_transfer][type]": "us_bank_transfer",
    }
    try {
      session = await createSession(withWire, brand)
    } catch (err) {
      console.error("wire-enabled session failed, falling back:", err)
      session = await createSession({
        ...base,
        mode: "payment",
        "invoice_creation[enabled]": "true",
      }, brand)
    }
  }

  await supabase
    .from("proposal_payments")
    .update({ stripe_checkout_session_id: session.id, status: "sent" })
    .eq("id", payment.id)

  // Each brand's sessions are created with that brand's own secret key, so
  // the matching publishable key is all the client needs (no stripeAccount).
  const publishableKey =
    (brand === "ammo"
      ? Deno.env.get("STRIPE_PK_AMMO")
      : Deno.env.get("STRIPE_PK_CAMBRIDGE")) ??
    Deno.env.get("STRIPE_PUBLISHABLE_KEY") ?? null

  return json({
    paid: false,
    client_secret: session.client_secret,
    publishable_key: publishableKey,
    stripe_account: null,
    amount: Number(payment.amount),
    label: payment.label,
  })
})
