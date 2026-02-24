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

  const corsHeaders = { "Access-Control-Allow-Origin": "*" }

  try {
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return Response.json({ error: "Unauthorized: no auth header" }, { status: 401, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // Verify the caller is an admin
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return Response.json({ error: "Unauthorized: no user" }, { status: 401, headers: corsHeaders })
    }

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (roleError) {
      return Response.json({ error: `Role lookup failed: ${roleError.message}` }, { status: 500, headers: corsHeaders })
    }

    if (roleData?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403, headers: corsHeaders })
    }

    const body = await req.json()
    const { email, role, organization_id, new_org_name } = body

    if (!email || typeof email !== "string") {
      return Response.json({ error: "Email is required" }, { status: 400, headers: corsHeaders })
    }

    let orgId = organization_id

    // Create new org if requested
    if (new_org_name && !organization_id) {
      // Get defaults from admin_settings
      const { data: defaultSettings, error: settingsError } = await supabaseAdmin
        .from("admin_settings")
        .select("default_monthly_ticket_limit, default_sla_days, default_billing_cycle_day")
        .limit(1)
        .single()

      if (settingsError) {
        console.warn("admin_settings lookup warning:", settingsError.message)
      }

      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from("organizations")
        .insert({
          name: new_org_name.trim(),
          monthly_ticket_limit: defaultSettings?.default_monthly_ticket_limit ?? 10,
          sla_days: defaultSettings?.default_sla_days ?? 3,
          billing_cycle_day: defaultSettings?.default_billing_cycle_day ?? 1,
        })
        .select("id")
        .single()

      if (orgError || !newOrg) {
        return Response.json(
          { error: `Failed to create organization: ${orgError?.message ?? "unknown"}` },
          { status: 500, headers: corsHeaders },
        )
      }

      orgId = newOrg.id

      // Enable maintenance module by default
      const { error: moduleError } = await supabaseAdmin.from("organization_modules").insert({
        organization_id: orgId,
        module_slug: "maintenance",
        enabled: true,
      })

      if (moduleError) {
        console.warn("Module insert warning (non-fatal):", moduleError.message)
      }
    }

    if (!orgId) {
      return Response.json({ error: "Organization is required" }, { status: 400, headers: corsHeaders })
    }

    // Generate invite token
    const token = crypto.randomUUID()

    // Create invite record
    const { error: inviteError } = await supabaseAdmin.from("client_invites").insert({
      email: email.trim().toLowerCase(),
      organization_id: orgId,
      role: role || "client",
      invited_by: user.id,
      token,
    })

    if (inviteError) {
      return Response.json(
        { error: `Failed to create invite: ${inviteError.message}` },
        { status: 500, headers: corsHeaders },
      )
    }

    // Get app URL for the invite link
    const { data: appSettings } = await supabaseAdmin
      .from("admin_settings")
      .select("app_url, agency_name")
      .limit(1)
      .single()

    const appUrl = appSettings?.app_url || Deno.env.get("APP_URL") || "http://localhost:5173"
    const agencyName = appSettings?.agency_name || "Cambridge Studio"
    const inviteUrl = `${appUrl}/accept-invite?token=${token}`

    // Send invite email via send-notification-email (best effort)
    try {
      const emailResponse = await fetch(
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
                <h2>You've been invited to ${agencyName}</h2>
                <p>You've been invited to join ${agencyName}'s client portal. Click the link below to set up your account:</p>
                <p><a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #000; color: #fff; text-decoration: none; border-radius: 6px;">Accept Invitation</a></p>
                <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this URL into your browser:</p>
                <p style="color: #666; font-size: 14px; word-break: break-all;">${inviteUrl}</p>
              </div>
            `,
            text: `You've been invited to ${agencyName}. Accept your invitation: ${inviteUrl}`,
          }),
        },
      )
      if (!emailResponse.ok) {
        console.error("Failed to send invite email:", await emailResponse.text())
      }
    } catch (emailErr) {
      console.error("Email send error:", emailErr)
    }

    // Also create the Supabase auth user with invite (non-blocking, best effort)
    try {
      const { error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
        redirectTo: inviteUrl,
      })
      if (authError) {
        console.warn("Auth invite warning (non-fatal):", authError.message)
      }
    } catch (authErr) {
      console.warn("Auth invite error (non-fatal):", authErr)
    }

    return Response.json({ success: true, token }, { headers: corsHeaders })
  } catch (error) {
    console.error("invite-client error:", error)
    const message = error instanceof Error ? error.message : String(error)
    return Response.json(
      { error: `Server error: ${message}` },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
