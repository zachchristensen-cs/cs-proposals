import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

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
      content_snapshot: proposal.content,
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

  await notifySigned(supabase, proposal, { firstName, lastName, email })

  return json({ ok: true, signed_at: signature.signed_at })
})

async function notifySigned(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  proposal: { id: string; slug: string; client_name: string | null },
  signer: { firstName: string; lastName: string; email: string },
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
          appUrl ? `Open it: ${appUrl}/proposals/${proposal.id}` : "",
        ].join("\n"),
      }),
    })
  } catch (err) {
    console.error("notifySigned error:", err)
  }
}
