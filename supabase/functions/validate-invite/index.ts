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
    const { token } = await req.json()

    if (!token) {
      return Response.json({ error: "Token is required" }, { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    )

    // Look up the invite by token
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from("team_invites")
      .select("id, email, accepted_at")
      .eq("token", token)
      .single()

    if (inviteError || !invite) {
      return Response.json({ error: "Invalid or expired invite link" }, { status: 404, headers: corsHeaders })
    }

    if (invite.accepted_at) {
      return Response.json({ error: "This invite has already been accepted" }, { status: 400, headers: corsHeaders })
    }

    return Response.json({
      valid: true,
      email: invite.email,
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("validate-invite error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    )
  }
})
