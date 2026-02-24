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

    // Get settings
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("notion_api_key, notion_clients_tracker_db_id")
      .limit(1)
      .single()

    if (!settings?.notion_api_key || !settings?.notion_clients_tracker_db_id) {
      return Response.json(
        { error: "Notion is not configured. Set the API key and Clients Tracker DB ID in Settings." },
        { status: 400, headers: corsHeaders },
      )
    }

    const notionHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.notion_api_key}`,
      "Notion-Version": "2022-06-28",
    }

    // Get the project with org name
    const { data: project, error: projErr } = await supabaseAdmin
      .from("projects")
      .select("*, organization:organizations(name)")
      .eq("id", project_id)
      .single()

    if (projErr || !project) {
      return Response.json({ error: "Project not found" }, { status: 404, headers: corsHeaders })
    }

    const orgName = (project.organization as unknown as { name: string } | null)?.name ?? "Unknown"

    // Get phases + rounds for this project
    const { data: phases } = await supabaseAdmin
      .from("project_phases")
      .select("*, rounds:phase_rounds(*)")
      .eq("project_id", project_id)
      .order("sort_order")

    if (!phases || phases.length === 0) {
      return Response.json({ error: "No phases found for project" }, { status: 400, headers: corsHeaders })
    }

    // 1. Create a page in the Clients Tracker database
    const createPageRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: notionHeaders,
      body: JSON.stringify({
        parent: { database_id: settings.notion_clients_tracker_db_id },
        properties: {
          Name: { title: [{ text: { content: `${orgName} - ${project.name}` } }] },
        },
      }),
    })

    const pageData = await createPageRes.json()

    if (!pageData.id) {
      console.error("Failed to create Notion page:", pageData)
      return Response.json(
        { error: `Failed to create Notion page: ${pageData.message || "Unknown error"}` },
        { status: 500, headers: corsHeaders },
      )
    }

    const notionPageId = pageData.id

    // 2. Create an inline database (Dashboard) inside the page
    // Build select options for Phase names
    const phaseOptions = phases.map((p: { name: string }) => ({
      name: p.name,
    }))

    const statusOptions = [
      { name: "Not Started", color: "default" },
      { name: "Not Needed", color: "gray" },
      { name: "Cambridge Studio WIP", color: "blue" },
      { name: "Client Feedback", color: "yellow" },
      { name: "Cambridge Studio Review", color: "purple" },
      { name: "Approved", color: "green" },
    ]

    const createDbRes = await fetch("https://api.notion.com/v1/databases", {
      method: "POST",
      headers: notionHeaders,
      body: JSON.stringify({
        parent: { type: "page_id", page_id: notionPageId },
        title: [{ text: { content: "Dashboard" } }],
        properties: {
          Deliverable: { title: {} },
          Phase: {
            select: { options: phaseOptions },
          },
          Status: {
            select: { options: statusOptions },
          },
          "Feedback Received": { date: {} },
          Notes: { rich_text: {} },
        },
      }),
    })

    const dbData = await createDbRes.json()

    if (!dbData.id) {
      console.error("Failed to create Notion database:", dbData)
      return Response.json(
        { error: `Failed to create Dashboard database: ${dbData.message || "Unknown error"}` },
        { status: 500, headers: corsHeaders },
      )
    }

    const notionDashboardDbId = dbData.id

    // 3. Create rows in the Dashboard for each phase round
    const roundUpdates: { roundId: string; notionRowId: string }[] = []

    for (const phase of phases) {
      const rounds = ((phase.rounds as unknown as { id: string; round_number: number; is_scope_addition: boolean }[]) || [])
        .sort((a, b) => a.round_number - b.round_number)

      for (const round of rounds) {
        const deliverableName = `${phase.name} - Round ${round.round_number}${round.is_scope_addition ? " (Scope Addition)" : ""}`

        const createRowRes = await fetch("https://api.notion.com/v1/pages", {
          method: "POST",
          headers: notionHeaders,
          body: JSON.stringify({
            parent: { database_id: notionDashboardDbId },
            properties: {
              Deliverable: { title: [{ text: { content: deliverableName } }] },
              Phase: { select: { name: phase.name } },
              Status: { select: { name: "Not Started" } },
            },
          }),
        })

        const rowData = await createRowRes.json()

        if (rowData.id) {
          roundUpdates.push({ roundId: round.id, notionRowId: rowData.id })
        }
      }
    }

    // 4. Store Notion IDs back to Supabase
    await supabaseAdmin
      .from("projects")
      .update({
        notion_page_id: notionPageId,
        notion_dashboard_db_id: notionDashboardDbId,
      })
      .eq("id", project_id)

    // Update each round with its notion_row_id
    for (const update of roundUpdates) {
      await supabaseAdmin
        .from("phase_rounds")
        .update({ notion_row_id: update.notionRowId })
        .eq("id", update.roundId)
    }

    return Response.json(
      {
        success: true,
        notion_page_id: notionPageId,
        notion_dashboard_db_id: notionDashboardDbId,
        rounds_synced: roundUpdates.length,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("create-notion-project error:", error)
    return Response.json(
      { error: `Internal server error: ${error}` },
      { status: 500, headers: corsHeaders },
    )
  }
})
