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

    const { project_id } = await req.json()

    if (!project_id) {
      return Response.json({ error: "project_id is required" }, { status: 400, headers: corsHeaders })
    }

    // Get the project's Notion dashboard DB ID
    const { data: project } = await supabaseAdmin
      .from("projects")
      .select("notion_dashboard_db_id")
      .eq("id", project_id)
      .single()

    if (!project?.notion_dashboard_db_id) {
      return Response.json(
        { error: "Project is not synced with Notion" },
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

    // Query the Notion database
    const queryRes = await fetch(
      `https://api.notion.com/v1/databases/${project.notion_dashboard_db_id}/query`,
      {
        method: "POST",
        headers: notionHeaders,
        body: JSON.stringify({
          sorts: [
            { property: "Phase", direction: "ascending" },
          ],
        }),
      },
    )

    const queryData = await queryRes.json()

    if (!queryData.results) {
      return Response.json(
        { error: `Failed to query Notion: ${queryData.message || "Unknown error"}` },
        { status: 500, headers: corsHeaders },
      )
    }

    // Map Notion rows to a clean response
    // deno-lint-ignore no-explicit-any
    const rows = queryData.results.map((page: any) => {
      const props = page.properties

      // Extract title (Deliverable)
      const deliverable =
        props.Deliverable?.title?.[0]?.plain_text ?? "Untitled"

      // Extract select (Phase)
      const phase = props.Phase?.select?.name ?? ""

      // Extract select (Status)
      const status = props.Status?.select?.name ?? "Not Started"

      // Extract date (Feedback Received)
      const feedbackReceived = props["Feedback Received"]?.date?.start ?? null

      // Extract rich_text (Notes)
      const notes =
        props.Notes?.rich_text?.map((t: { plain_text: string }) => t.plain_text).join("") ?? ""

      return {
        notion_page_id: page.id,
        deliverable,
        phase,
        status,
        feedback_received: feedbackReceived,
        notes,
      }
    })

    return Response.json({ rows }, { headers: corsHeaders })
  } catch (error) {
    console.error("fetch-notion-dashboard error:", error)
    return Response.json(
      { error: `Internal server error: ${error}` },
      { status: 500, headers: corsHeaders },
    )
  }
})
