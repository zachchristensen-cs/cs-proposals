import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { notion_page_id } = await req.json()

    if (!notion_page_id) {
      return Response.json(
        { error: "notion_page_id is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    // Get Notion API key
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("notion_api_key")
      .limit(1)
      .single()

    if (!settings?.notion_api_key) {
      return Response.json(
        { error: "Notion API key not configured" },
        { status: 400, headers: corsHeaders },
      )
    }

    const notionHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.notion_api_key}`,
      "Notion-Version": "2022-06-28",
    }

    // Update the Notion page:
    // - Status → "Cambridge Studio Review"
    // - Feedback Received → today's date
    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

    const updateRes = await fetch(`https://api.notion.com/v1/pages/${notion_page_id}`, {
      method: "PATCH",
      headers: notionHeaders,
      body: JSON.stringify({
        properties: {
          Status: { select: { name: "Cambridge Studio Review" } },
          "Feedback Received": { date: { start: today } },
        },
      }),
    })

    const updateData = await updateRes.json()

    if (updateData.object === "error") {
      return Response.json(
        { error: `Notion update failed: ${updateData.message}` },
        { status: 500, headers: corsHeaders },
      )
    }

    return Response.json(
      { success: true, notion_page_id },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("submit-notion-feedback error:", error)
    return Response.json(
      { error: `Internal server error: ${error}` },
      { status: 500, headers: corsHeaders },
    )
  }
})
