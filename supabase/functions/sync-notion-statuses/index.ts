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

    // Get settings
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("notion_api_key")
      .limit(1)
      .single()

    if (!settings?.notion_api_key) {
      return Response.json({ error: "Notion not configured" }, { status: 400 })
    }

    // Get all tickets with notion_page_id
    const { data: tickets } = await supabaseAdmin
      .from("tickets")
      .select("id, status, notion_page_id")
      .not("notion_page_id", "is", null)

    if (!tickets || tickets.length === 0) {
      return Response.json({ success: true, synced: 0 }, {
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    // Notion status → local status mapping
    const notionToLocal: Record<string, string> = {
      Submitted: "submitted",
      Processing: "processing",
      "In Dev": "in_dev",
      "In Progress": "in_progress",
      Completed: "completed",
    }

    let synced = 0

    for (const ticket of tickets) {
      try {
        const notionRes = await fetch(
          `https://api.notion.com/v1/pages/${ticket.notion_page_id}`,
          {
            headers: {
              Authorization: `Bearer ${settings.notion_api_key}`,
              "Notion-Version": "2022-06-28",
            },
          },
        )

        if (!notionRes.ok) continue

        const notionData = await notionRes.json()
        const statusProp = notionData.properties?.Status
        let notionStatus = ""

        if (statusProp?.select?.name) {
          notionStatus = statusProp.select.name
        } else if (statusProp?.status?.name) {
          notionStatus = statusProp.status.name
        }

        const localStatus = notionToLocal[notionStatus]
        if (localStatus && localStatus !== ticket.status) {
          const updateData: Record<string, unknown> = { status: localStatus }
          if (localStatus === "completed") {
            updateData.completed_at = new Date().toISOString()
          }

          await supabaseAdmin
            .from("tickets")
            .update(updateData)
            .eq("id", ticket.id)

          synced++
        }
      } catch {
        // Skip individual ticket errors
        continue
      }
    }

    return Response.json({ success: true, synced, total: tickets.length }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("sync-notion-statuses error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
