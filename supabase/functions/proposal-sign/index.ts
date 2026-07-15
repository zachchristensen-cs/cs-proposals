import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { createFirstInstallmentInvoice, createRetainerSubscription, type StripeResult } from "./stripe.ts"
import { markDealClosedWon } from "./attio.ts"

// Public signing endpoint for proposals. Deployed with --no-verify-jwt.
// POST {
//   slug, token?, first_name, last_name, email,
//   signature_type: "typed" | "drawn", signature_data, consent: true
// }
// Snapshots the content, marks the proposal signed, and notifies the team.
// Phase 4 chains Stripe invoicing + Attio closed-won from here.

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Ported from src/features/proposals/lib/selection.ts - keep in sync.
// deno-lint-ignore no-explicit-any
function computeAdjustedTotals(content: any, deselected: Set<string>) {
  let subtotal = 0
  // deno-lint-ignore no-explicit-any
  ;(content.phases ?? []).forEach((phase: any, pi: number) => {
    if (phase.optional && deselected.has(`p:${pi}`)) return
    const items = phase.items ?? []
    // deno-lint-ignore no-explicit-any
    const priced = items.filter((it: any) => it.price > 0)
    if (priced.length > 0) {
      // deno-lint-ignore no-explicit-any
      items.forEach((item: any, ii: number) => {
        if (item.optional && deselected.has(`${pi}:${ii}`)) return
        subtotal += item.price || 0
      })
    } else {
      subtotal += phase.price ?? phase.subtotal ?? 0
    }
  })

  let discountTotal = 0
  for (const d of content.discounts ?? []) {
    if (d.amount && d.amount > 0) discountTotal += d.amount
    else if (d.percent && d.percent > 0) discountTotal += Math.round((subtotal * d.percent) / 100)
  }
  discountTotal = Math.min(discountTotal, subtotal)
  const total = subtotal - discountTotal

  const terms = content.payment?.terms ?? []
  // deno-lint-ignore no-explicit-any
  const originalSum = terms.reduce((sum: number, t: any) => sum + (t.amount || 0), 0)
  let allocated = 0
  // deno-lint-ignore no-explicit-any
  const termAmounts = terms.map((t: any, i: number) => {
    if (i === terms.length - 1) return Math.max(0, total - allocated)
    const ratio = originalSum > 0 ? (t.amount || 0) / originalSum : 1 / (terms.length || 1)
    const amt = Math.round(total * ratio)
    allocated += amt
    return amt
  })

  return { subtotal, discountTotal, total, termAmounts }
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
  const firstName = typeof body?.first_name === "string" ? body.first_name.trim().slice(0, 100) : ""
  const lastName = typeof body?.last_name === "string" ? body.last_name.trim().slice(0, 100) : ""
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : ""
  const signatureType = body?.signature_type
  const signatureData = typeof body?.signature_data === "string" ? body.signature_data : ""

  if (!slug) return json({ error: "slug required" }, 400)
  if (!firstName || !lastName) return json({ error: "First and last name are required" }, 400)
  if (!EMAIL_RE.test(email)) return json({ error: "A valid email is required" }, 400)
  if (signatureType !== "typed" && signatureType !== "drawn") {
    return json({ error: "invalid signature_type" }, 400)
  }
  if (!signatureData || signatureData.length > 200_000) {
    return json({ error: "invalid signature_data" }, 400)
  }
  if (signatureType === "drawn" && !signatureData.startsWith("data:image/png;base64,")) {
    return json({ error: "drawn signature must be a PNG data URL" }, 400)
  }
  if (body?.consent !== true) {
    return json({ error: "Consent is required to sign" }, 400)
  }

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
  if (proposal.status === "archived") return json({ error: "This proposal is no longer active" }, 410)
  if (proposal.signed_at || proposal.status === "signed") {
    return json({ error: "This proposal has already been signed" }, 409)
  }

  let recipientId: string | null = null
  if (body.token && typeof body.token === "string") {
    const { data: recipient } = await supabase
      .from("proposal_recipients")
      .select("id")
      .eq("token", body.token)
      .eq("proposal_id", proposal.id)
      .single()
    recipientId = recipient?.id ?? null
  }

  const deselectedItems: string[] = Array.isArray(body.deselected_items)
    ? body.deselected_items.slice(0, 200).map((k: unknown) => String(k).slice(0, 20))
    : []
  const deselected = new Set(deselectedItems)
  const adjusted = computeAdjustedTotals(proposal.content ?? {}, deselected)

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
  const userAgent = req.headers.get("user-agent")

  const { data: signature, error: insertError } = await supabase
    .from("proposal_signatures")
    .insert({
      proposal_id: proposal.id,
      recipient_id: recipientId,
      first_name: firstName,
      last_name: lastName,
      email,
      signature_type: signatureType,
      signature_data: signatureData,
      consent: true,
      ip,
      user_agent: userAgent,
      content_snapshot: {
        ...proposal.content,
        _signing: {
          deselected_items: deselectedItems,
          subtotal: adjusted.subtotal,
          discount_total: adjusted.discountTotal,
          total: adjusted.total,
        },
      },
    })
    .select("id, signed_at")
    .single()

  if (insertError || !signature) {
    // Unique index on proposal_id means a concurrent signature already landed
    return json({ error: "This proposal has already been signed" }, 409)
  }

  await supabase
    .from("proposals")
    .update({ status: "signed", signed_at: signature.signed_at })
    .eq("id", proposal.id)

  // ─── Phase 4 chain: Stripe invoice + Attio closed-won ───────
  // deno-lint-ignore no-explicit-any
  const content: any = proposal.content ?? {}
  const brand: string = content.brand === "ammo" ? "ammo" : "cambridge"
  const clientName: string = proposal.client_name || content.cover?.client_name || ""
  const signerName = `${firstName} ${lastName}`

  const origin = req.headers.get("origin") || Deno.env.get("APP_URL") || ""

  let stripeResult: StripeResult | null = null
  let stripeSummary = ""
  try {
    if (content.proposal_type === "retainer") {
      const monthly = Number(content.retainer_amount ?? adjusted.total ?? content.total ?? 0)
      stripeResult = await createRetainerSubscription({
        brand,
        clientName,
        signerEmail: email,
        signerName,
        monthlyAmount: monthly,
        proposalSlug: proposal.slug,
        origin,
      })
      stripeSummary = `Stripe: monthly retainer checkout started ($${stripeResult.amount.toLocaleString()}/mo).`
    } else {
      // deno-lint-ignore no-explicit-any
      const terms = (Array.isArray(content.payment?.terms) ? content.payment.terms : []).map(
        // deno-lint-ignore no-explicit-any
        (t: any, i: number) => ({ ...t, amount: adjusted.termAmounts[i] ?? t.amount }),
      )
      stripeResult = await createFirstInstallmentInvoice({
        brand,
        clientName,
        signerEmail: email,
        signerName,
        terms,
        proposalSlug: proposal.slug,
        origin,
      })
      stripeSummary = `Stripe: "${stripeResult.label}" checkout created ($${stripeResult.amount.toLocaleString()}).`
    }

    await supabase.from("proposal_payments").insert({
      proposal_id: proposal.id,
      brand,
      stripe_customer_id: stripeResult.customerId,
      stripe_checkout_session_id: stripeResult.sessionId ?? null,
      stripe_invoice_id: stripeResult.invoiceId ?? null,
      stripe_subscription_id: stripeResult.subscriptionId ?? null,
      label: stripeResult.label,
      amount: stripeResult.amount,
      hosted_invoice_url: stripeResult.hostedInvoiceUrl ?? null,
      status: "sent",
    })
  } catch (err) {
    console.error("Stripe error:", err)
    stripeSummary = `Stripe invoice FAILED: ${err instanceof Error ? err.message : "unknown error"}. Create it manually.`
  }

  const publicUrl = `${Deno.env.get("APP_URL") || ""}/p/${proposal.slug}`
  const attio = await markDealClosedWon({
    signerEmail: email,
    clientName,
    proposalUrl: publicUrl,
  })
  if (attio.dealId) {
    await supabase.from("proposals").update({ attio_deal_id: attio.dealId }).eq("id", proposal.id)
  }

  await notifySigned(supabase, proposal, { firstName, lastName, email }, [stripeSummary, attio.summary])

  return json({
    ok: true,
    signed_at: signature.signed_at,
    payment_url: stripeResult?.hostedInvoiceUrl ?? null,
  })
})

async function notifySigned(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  proposal: { id: string; slug: string; client_name: string | null },
  signer: { firstName: string; lastName: string; email: string },
  extras: string[] = [],
) {
  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    if (!resendApiKey) return

    const { data: settings } = await supabase
      .from("admin_settings")
      .select("admin_notification_emails")
      .limit(1)
      .single()

    const to: string[] = settings?.admin_notification_emails ?? []
    if (!to.length) return

    const client = proposal.client_name || proposal.slug
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Cambridge Studio <noreply@mail.cambridgestudio.com>"
    const appUrl = Deno.env.get("APP_URL") || ""

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: `Proposal SIGNED: ${client}`,
        text: [
          `${signer.firstName} ${signer.lastName} (${signer.email}) just signed the ${client} proposal.`,
          "",
          ...extras.filter(Boolean),
          "",
          appUrl ? `Open it: ${appUrl}/proposals/${proposal.id}` : "",
        ].join("\n"),
      }),
    })
  } catch (err) {
    console.error("notifySigned error:", err)
  }
}
