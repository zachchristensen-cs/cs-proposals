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
    const { event_type, data } = await req.json()

    if (!event_type) {
      return Response.json({ error: "event_type is required" }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("*")
      .limit(1)
      .single()

    if (!settings) {
      return Response.json({ error: "Settings not found" }, { status: 500 })
    }

    const baseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    async function sendEmail(to: string | string[], subject: string, html: string, text: string) {
      if (!settings.admin_emails_enabled && !settings.client_emails_enabled) return
      await fetch(`${baseUrl}/functions/v1/send-notification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ to, subject, html, text }),
      })
    }

    async function sendSlack(text: string) {
      await fetch(`${baseUrl}/functions/v1/send-slack-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ text }),
      })
    }

    const agencyName = settings.agency_name || "Cambridge Studio"

    switch (event_type) {
      case "ticket_submitted": {
        const { ticket_id, organization_id } = data

        // Get ticket and org info
        const { data: ticket } = await supabaseAdmin
          .from("tickets")
          .select("title, user:users(email)")
          .eq("id", ticket_id)
          .single()

        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("name")
          .eq("id", organization_id)
          .single()

        const ticketTitle = ticket?.title ?? "Untitled"
        const submitterEmail = (ticket?.user as unknown as { email: string })?.email ?? "Unknown"
        const orgName = org?.name ?? "Unknown"

        // Notify admins
        if (settings.admin_emails_enabled && settings.admin_notification_emails?.length > 0) {
          await sendEmail(
            settings.admin_notification_emails,
            `New ticket: ${ticketTitle}`,
            `<div style="font-family: sans-serif;"><h2>New Maintenance Ticket</h2><p><strong>${ticketTitle}</strong></p><p>From: ${submitterEmail} (${orgName})</p><p><a href="${settings.app_url}/admin/maintenance/${ticket_id}">View Ticket</a></p></div>`,
            `New ticket: ${ticketTitle} from ${submitterEmail} (${orgName})`,
          )
        }

        // Slack
        await sendSlack(`📋 New ticket: *${ticketTitle}* from ${orgName} (${submitterEmail})`)
        break
      }

      case "ticket_completed": {
        const { ticket_id, organization_id } = data

        const { data: ticket } = await supabaseAdmin
          .from("tickets")
          .select("title, user_id, user:users(email)")
          .eq("id", ticket_id)
          .single()

        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("name")
          .eq("id", organization_id)
          .single()

        const ticketTitle = ticket?.title ?? "Untitled"
        const clientEmail = (ticket?.user as unknown as { email: string })?.email
        const orgName = org?.name ?? "Unknown"

        // Notify client
        if (settings.client_emails_enabled && clientEmail) {
          await sendEmail(
            clientEmail,
            `Ticket completed: ${ticketTitle}`,
            `<div style="font-family: sans-serif;"><h2>Your ticket has been completed!</h2><p><strong>${ticketTitle}</strong></p><p>Your maintenance request has been completed by the ${agencyName} team.</p><p><a href="${settings.app_url}/dashboard/maintenance/${ticket_id}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">View Ticket</a></p></div>`,
            `Your ticket "${ticketTitle}" has been completed. View it at ${settings.app_url}/dashboard/maintenance/${ticket_id}`,
          )
        }

        // Slack
        await sendSlack(`✅ Ticket completed: *${ticketTitle}* (${orgName})`)
        break
      }

      case "invite_sent": {
        const { email, organization_name } = data

        // Slack only
        await sendSlack(`📨 Invitation sent to *${email}* for ${organization_name || "a new organization"}`)
        break
      }

      default:
        console.warn(`Unknown event type: ${event_type}`)
    }

    return Response.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("send-notification error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
