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
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
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
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email, organization_id } = await req.json()

    if (!email || !organization_id) {
      return Response.json({ error: "Email and organization_id are required" }, { status: 400 })
    }

    // Verify the caller is an org owner
    const { data: membership } = await supabaseAdmin
      .from("user_organizations")
      .select("is_owner")
      .eq("user_id", user.id)
      .eq("organization_id", organization_id)
      .single()

    if (!membership?.is_owner) {
      // Also allow admins
      const { data: roleData } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single()

      if (roleData?.role !== "admin") {
        return Response.json({ error: "Only org owners or admins can invite team members" }, { status: 403 })
      }
    }

    const token = crypto.randomUUID()

    const { error: inviteError } = await supabaseAdmin.from("client_invites").insert({
      email: email.trim().toLowerCase(),
      organization_id,
      role: "client",
      invited_by: user.id,
      token,
    })

    if (inviteError) {
      return Response.json({ error: `Failed to create invite: ${inviteError.message}` }, { status: 500 })
    }

    const { data: settings } = await supabaseAdmin
      .from("admin_settings")
      .select("app_url, agency_name")
      .limit(1)
      .single()

    const appUrl = settings?.app_url || "http://localhost:5173"
    const agencyName = settings?.agency_name || "Cambridge Studio"
    const inviteUrl = `${appUrl}/accept-invite?token=${token}`

    try {
      await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to: email.trim().toLowerCase(),
            subject: `You've been invited to ${agencyName}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Team Invitation</h2>
                <p>You've been invited to join a team on ${agencyName}'s client portal.</p>
                <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
                <p style="color: #666; font-size: 14px;">${inviteUrl}</p>
              </div>
            `,
            text: `You've been invited to ${agencyName}. Accept: ${inviteUrl}`,
          }),
        },
      )
    } catch {
      console.error("Failed to send invite email")
    }

    await supabaseAdmin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
      redirectTo: inviteUrl,
    })

    return Response.json({ success: true }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("invite-team-member error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
