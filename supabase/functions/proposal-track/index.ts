import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// Public tracking endpoint for proposal views. Deployed with --no-verify-jwt
// (anonymous viewers have no session). Accepts:
//   { type: "open", slug, session_id, token?, referrer? }
//   { type: "ping", slug, session_id, duration_seconds, max_scroll_pct, sections_viewed }
// Body may arrive as text/plain (fetch keepalive / sendBeacon), so we parse manually.

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

  const { type, slug, session_id } = body ?? {}
  if (!slug || typeof slug !== "string") return json({ error: "slug required" }, 400)
  if (!session_id || typeof session_id !== "string" || session_id.length > 64) {
    return json({ error: "session_id required" }, 400)
  }
  if (type !== "open" && type !== "ping") return json({ error: "invalid type" }, 400)

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  const { data: proposal } = await supabase
    .from("proposals")
    .select("id, slug, status, client_name")
    .eq("slug", slug)
    .single()

  if (!proposal) return json({ error: "Not found" }, 404)

  if (type === "open") {
    let recipient: { id: string; name: string; email: string } | null = null
    if (body.token && typeof body.token === "string") {
      const { data } = await supabase
        .from("proposal_recipients")
        .select("id, name, email")
        .eq("token", body.token)
        .eq("proposal_id", proposal.id)
        .single()
      recipient = data
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null

    const { error } = await supabase.from("proposal_views").insert({
      proposal_id: proposal.id,
      recipient_id: recipient?.id ?? null,
      session_id,
      user_agent: req.headers.get("user-agent"),
      referrer: typeof body.referrer === "string" ? body.referrer.slice(0, 500) : null,
      ip,
    })

    // Only notify on a brand-new session (insert failed = duplicate open)
    if (!error && proposal.status === "sent") {
      await notifyOpen(supabase, proposal, recipient)
    }

    return json({ ok: true })
  }

  // type === "ping": update running totals for this session
  const sections = Array.isArray(body.sections_viewed)
    ? body.sections_viewed.slice(0, 50).map((s: unknown) => String(s).slice(0, 100))
    : undefined

  // deno-lint-ignore no-explicit-any
  const updates: Record<string, any> = {
    last_seen_at: new Date().toISOString(),
    duration_seconds: clampInt(body.duration_seconds, 0, 86400),
    max_scroll_pct: clampInt(body.max_scroll_pct, 0, 100),
  }
  if (sections) updates.sections_viewed = sections

  await supabase
    .from("proposal_views")
    .update(updates)
    .eq("session_id", session_id)
    .eq("proposal_id", proposal.id)

  return json({ ok: true })
})

function clampInt(value: unknown, min: number, max: number): number {
  const n = Math.round(Number(value))
  if (Number.isNaN(n)) return min
  return Math.max(min, Math.min(max, n))
}

async function notifyOpen(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  proposal: { id: string; slug: string; client_name: string | null },
  recipient: { name: string; email: string } | null,
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

    const who = recipient
      ? `${recipient.name || recipient.email} (${recipient.email})`
      : "Someone (untracked link)"
    const client = proposal.client_name || proposal.slug
    const fromEmail = Deno.env.get("FROM_EMAIL") || "Cambridge Studio <noreply@mail.cambridgestudio.com>"
    const appUrl = Deno.env.get("APP_URL") || ""
    const link = appUrl ? `${appUrl}/proposals/${proposal.id}` : ""

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to,
        subject: `Proposal viewed: ${client}`,
        text: [
          `${who} just opened the ${client} proposal.`,
          "",
          link ? `View activity: ${link}` : "",
        ].join("\n"),
      }),
    })
  } catch (err) {
    // Never fail tracking because email failed
    console.error("notifyOpen error:", err)
  }
}
