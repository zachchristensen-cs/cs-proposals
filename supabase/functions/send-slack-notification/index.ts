import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    })
  }

  try {
    const { text, blocks } = await req.json()

    if (!text && !blocks) {
      return Response.json({ error: "text or blocks is required" }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("slack_webhook_url")
      .limit(1)
      .single()

    if (!settings?.slack_webhook_url) {
      // Silently no-op if no webhook configured
      return Response.json({ success: true, skipped: true }, {
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    const payload: Record<string, unknown> = { text }
    if (blocks) {
      payload.blocks = blocks
    }

    const res = await fetch(settings.slack_webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      console.error("Slack webhook error:", await res.text())
      return Response.json({ error: "Slack notification failed" }, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    return Response.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("send-slack-notification error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
