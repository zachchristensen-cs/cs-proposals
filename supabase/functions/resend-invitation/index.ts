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
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    const { data: roleData } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!roleData?.role || !["admin", "member"].includes(roleData.role)) {
      return Response.json({ error: "Admin access required" }, { status: 403, headers: corsHeaders })
    }

    const { invite_id } = await req.json()

    if (!invite_id) {
      return Response.json({ error: "invite_id is required" }, { status: 400, headers: corsHeaders })
    }

    const { data: invite, error } = await supabaseAdmin
      .from("team_invites")
      .select("*")
      .eq("id", invite_id)
      .single()

    if (error || !invite) {
      return Response.json({ error: "Invite not found" }, { status: 404, headers: corsHeaders })
    }

    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("app_url, agency_name")
      .limit(1)
      .single()

    const appUrl = settings?.app_url || "http://localhost:5173"
    const agencyName = settings?.agency_name || "Cambridge Studio"
    const inviteUrl = `${appUrl}/accept-invite?token=${invite.token}`

    await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: invite.email,
          subject: `Reminder: You've been invited to ${agencyName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Invitation Reminder</h2>
              <p>This is a reminder that you've been invited to join ${agencyName}.</p>
              <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
              <p style="color: #666; font-size: 14px;">${inviteUrl}</p>
            </div>
          `,
          text: `Reminder: You've been invited to ${agencyName}. Accept: ${inviteUrl}`,
        }),
      },
    )

    return Response.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error("resend-invitation error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    )
  }
})
