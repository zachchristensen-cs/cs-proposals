import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

// This function is designed to run daily at 00:05 UTC via a cron schedule.
// For each org: if today matches their billing_cycle_day, reset tickets_used to 0.
// Handles month-end edge cases (e.g., billing_cycle_day 31 resets on the last day of shorter months).

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

    const now = new Date()
    const today = now.getUTCDate()
    const currentMonth = now.getUTCMonth()
    const currentYear = now.getUTCFullYear()

    // Get the last day of the current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getUTCDate()

    // Get all orgs
    const { data: orgs, error } = await supabaseAdmin
      .from("organizations")
      .select("id, billing_cycle_day, tickets_used")

    if (error || !orgs) {
      return Response.json({ error: "Failed to fetch organizations" }, { status: 500 })
    }

    let resetCount = 0

    for (const org of orgs) {
      let shouldReset = false

      if (org.billing_cycle_day === today) {
        // Exact match
        shouldReset = true
      } else if (org.billing_cycle_day > lastDayOfMonth && today === lastDayOfMonth) {
        // Edge case: billing_cycle_day is 29/30/31 but month has fewer days
        // Reset on the last day of the month instead
        shouldReset = true
      }

      if (shouldReset && org.tickets_used > 0) {
        await supabaseAdmin
          .from("organizations")
          .update({ tickets_used: 0 })
          .eq("id", org.id)

        resetCount++
      }
    }

    console.log(`Reset ticket usage for ${resetCount} organizations on day ${today}`)

    return Response.json({
      success: true,
      reset_count: resetCount,
      total_orgs: orgs.length,
      today,
      last_day_of_month: lastDayOfMonth,
    }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("reset-ticket-usage error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
