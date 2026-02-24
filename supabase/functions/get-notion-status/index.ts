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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { ticket_id } = await req.json()

    if (!ticket_id) {
      return Response.json({ error: "ticket_id is required" }, { status: 400 })
    }

    // Get ticket
    const { data: ticket } = await supabaseAdmin
      .from("tickets")
      .select("notion_page_id")
      .eq("id", ticket_id)
      .single()

    if (!ticket?.notion_page_id) {
      return Response.json({ error: "Ticket not synced to Notion" }, { status: 400 })
    }

    // Get settings
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("notion_api_key")
      .limit(1)
      .single()

    if (!settings?.notion_api_key) {
      return Response.json({ error: "Notion not configured" }, { status: 400 })
    }

    // Query Notion page
    const notionRes = await fetch(`https://api.notion.com/v1/pages/${ticket.notion_page_id}`, {
      headers: {
        Authorization: `Bearer ${settings.notion_api_key}`,
        "Notion-Version": "2022-06-28",
      },
    })

    if (!notionRes.ok) {
      return Response.json({ error: "Failed to fetch Notion page" }, { status: 500 })
    }

    const notionData = await notionRes.json()

    // Extract status from properties
    const statusProp = notionData.properties?.Status
    let status = "unknown"

    if (statusProp?.select?.name) {
      status = statusProp.select.name
    } else if (statusProp?.status?.name) {
      status = statusProp.status.name
    }

    return Response.json({ success: true, status, notion_page_id: ticket.notion_page_id }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("get-notion-status error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
