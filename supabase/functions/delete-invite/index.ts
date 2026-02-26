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

    const { error } = await supabaseAdmin
      .from("team_invites")
      .delete()
      .eq("id", invite_id)

    if (error) {
      return Response.json({ error: "Failed to delete invite" }, { status: 500, headers: corsHeaders })
    }

    return Response.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error("delete-invite error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    )
  }
})
