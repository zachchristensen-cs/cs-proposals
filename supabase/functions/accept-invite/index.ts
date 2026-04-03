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
      .from("team_invites")
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

    // Upsert user record with role
    const { error: userError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name ?? null,
          role: invite.role,
        },
        { onConflict: "id" },
      )

    if (userError) {
      return Response.json(
        { error: `Failed to create user record: ${userError.message}` },
        { status: 500, headers: corsHeaders },
      )
    }

    // Mark invite as accepted
    const { error: acceptError } = await supabaseAdmin
      .from("team_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id)

    if (acceptError) {
      console.error("Failed to mark invite as accepted:", acceptError)
      return Response.json(
        { error: "Failed to accept invitation" },
        { status: 500, headers: corsHeaders },
      )
    }

    return Response.json(
      { success: true },
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
