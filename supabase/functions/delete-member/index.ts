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

    // Verify the requesting user
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders })
    }

    // Check that the requesting user is admin or member
    const { data: roleData } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!roleData?.role || !["admin", "member"].includes(roleData.role)) {
      return Response.json({ error: "Admin access required" }, { status: 403, headers: corsHeaders })
    }

    const { member_id } = await req.json()

    if (!member_id) {
      return Response.json({ error: "member_id is required" }, { status: 400, headers: corsHeaders })
    }

    // Prevent deleting yourself
    if (member_id === user.id) {
      return Response.json({ error: "You cannot remove yourself" }, { status: 400, headers: corsHeaders })
    }

    // Verify the target is a team member
    const { data: targetRole } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", member_id)
      .single()

    if (!targetRole?.role || !["admin", "member"].includes(targetRole.role)) {
      return Response.json({ error: "User is not a team member" }, { status: 400, headers: corsHeaders })
    }

    // Delete the user from auth (cascades to users table)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(member_id)

    if (error) {
      console.error("Failed to delete member:", error)
      return Response.json({ error: "Failed to remove team member" }, { status: 500, headers: corsHeaders })
    }

    return Response.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error("delete-member error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    )
  }
})
