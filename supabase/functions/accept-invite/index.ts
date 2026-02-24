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

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return Response.json({ error: "Unauthorized: invalid token" }, { status: 401, headers: corsHeaders })
    }

    const { token } = await req.json()

    if (!token) {
      return Response.json({ error: "Token is required" }, { status: 400, headers: corsHeaders })
    }

    // Find the invite
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("client_invites")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .single()

    if (inviteError || !invite) {
      return Response.json(
        { error: `Invalid or expired invitation: ${inviteError?.message ?? "not found"}` },
        { status: 404, headers: corsHeaders },
      )
    }

    // Ensure user record exists first (FK dependency for user_organizations and user_roles)
    const { error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name ?? null,
        },
        { onConflict: "id" },
      )

    if (userError) {
      return Response.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 500, headers: corsHeaders },
      )
    }

    // Set user role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        {
          user_id: user.id,
          role: invite.role,
        },
        { onConflict: "user_id" },
      )

    if (roleError) {
      console.warn("Role upsert warning:", roleError.message)
    }

    // Add user to org (only if invite has an organization)
    if (invite.organization_id) {
      const { error: joinError } = await supabaseAdmin
        .from("user_organizations")
        .upsert(
          {
            user_id: user.id,
            organization_id: invite.organization_id,
            is_owner: false,
          },
          { onConflict: "user_id,organization_id" },
        )

      if (joinError) {
        return Response.json(
          { error: `Failed to join organization: ${joinError.message}` },
          { status: 500, headers: corsHeaders },
        )
      }
    }

    // Mark invite as accepted
    await supabaseAdmin
      .from("client_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)

    return Response.json(
      { success: true, organization_id: invite.organization_id },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("accept-invite error:", error)
    const message = error instanceof Error ? error.message : String(error)
    return Response.json(
      { error: `Server error: ${message}` },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
