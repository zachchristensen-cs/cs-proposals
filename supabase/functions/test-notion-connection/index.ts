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
      .select("notion_database_id, notion_api_key")
      .limit(1)
      .single()

    if (!settings?.notion_api_key || !settings?.notion_database_id) {
      return Response.json({ success: false, error: "Notion API key or database ID not configured" }, {
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    // Try to query the database
    const res = await fetch(
      `https://api.notion.com/v1/databases/${settings.notion_database_id}`,
      {
        headers: {
          Authorization: `Bearer ${settings.notion_api_key}`,
          "Notion-Version": "2022-06-28",
        },
      },
    )

    if (!res.ok) {
      const errorData = await res.json()
      return Response.json({
        success: false,
        error: errorData.message || `Notion returned ${res.status}`,
      }, {
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    const dbData = await res.json()

    return Response.json({
      success: true,
      database_title: dbData.title?.[0]?.plain_text || "Untitled",
      property_count: Object.keys(dbData.properties || {}).length,
    }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("test-notion-connection error:", error)
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
