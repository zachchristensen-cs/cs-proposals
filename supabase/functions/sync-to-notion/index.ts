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

    // Get settings
    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("notion_database_id, notion_api_key")
      .limit(1)
      .single()

    if (!settings?.notion_api_key || !settings?.notion_database_id) {
      return Response.json({ error: "Notion is not configured" }, { status: 400 })
    }

    // Get ticket with org and user info
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from("tickets")
      .select("*, organization:organizations(name), user:users(email, full_name)")
      .eq("id", ticket_id)
      .single()

    if (ticketError || !ticket) {
      return Response.json({ error: "Ticket not found" }, { status: 404 })
    }

    const org = ticket.organization as unknown as { name: string } | null
    const user = ticket.user as unknown as { email: string; full_name: string | null } | null

    // Convert HTML to plain text for Notion (basic strip)
    const plainContent = (ticket.processed_content || ticket.raw_message || "")
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim()

    const statusMap: Record<string, string> = {
      submitted: "Submitted",
      processing: "Processing",
      in_dev: "In Dev",
      in_progress: "In Progress",
      completed: "Completed",
    }

    const notionHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.notion_api_key}`,
      "Notion-Version": "2022-06-28",
    }

    let notionPageId = ticket.notion_page_id

    if (notionPageId) {
      // Update existing page
      await fetch(`https://api.notion.com/v1/pages/${notionPageId}`, {
        method: "PATCH",
        headers: notionHeaders,
        body: JSON.stringify({
          properties: {
            Name: { title: [{ text: { content: ticket.title } }] },
            Status: { select: { name: statusMap[ticket.status] || ticket.status } },
          },
        }),
      })

      // Update content
      // First get existing blocks to clear
      const blocksRes = await fetch(
        `https://api.notion.com/v1/blocks/${notionPageId}/children?page_size=100`,
        { headers: notionHeaders },
      )
      const blocksData = await blocksRes.json()

      // Delete existing blocks
      if (blocksData.results) {
        for (const block of blocksData.results) {
          await fetch(`https://api.notion.com/v1/blocks/${block.id}`, {
            method: "DELETE",
            headers: notionHeaders,
          })
        }
      }

      // Add updated content
      await fetch(`https://api.notion.com/v1/blocks/${notionPageId}/children`, {
        method: "PATCH",
        headers: notionHeaders,
        body: JSON.stringify({
          children: [
            {
              type: "paragraph",
              paragraph: {
                rich_text: [{ text: { content: plainContent.slice(0, 2000) } }],
              },
            },
          ],
        }),
      })
    } else {
      // Create new page
      const createRes = await fetch("https://api.notion.com/v1/pages", {
        method: "POST",
        headers: notionHeaders,
        body: JSON.stringify({
          parent: { database_id: settings.notion_database_id },
          properties: {
            Name: { title: [{ text: { content: ticket.title } }] },
            Status: { select: { name: statusMap[ticket.status] || ticket.status } },
            Organization: { rich_text: [{ text: { content: org?.name || "Unknown" } }] },
            Submitter: { rich_text: [{ text: { content: user?.email || "Unknown" } }] },
          },
          children: [
            {
              type: "paragraph",
              paragraph: {
                rich_text: [{ text: { content: plainContent.slice(0, 2000) } }],
              },
            },
          ],
        }),
      })

      const createData = await createRes.json()

      if (createData.id) {
        notionPageId = createData.id

        // Store the Notion page ID on the ticket
        await supabaseAdmin
          .from("tickets")
          .update({ notion_page_id: notionPageId })
          .eq("id", ticket_id)
      }
    }

    return Response.json({ success: true, notion_page_id: notionPageId }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("sync-to-notion error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
