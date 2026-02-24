import "jsr:@supabase/functions-js/edge-runtime.d.ts"

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
    const { to, subject, html, text } = await req.json()

    if (!to || !subject) {
      return Response.json({ error: "to and subject are required" }, { status: 400 })
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured, skipping email")
      return Response.json({ success: true, skipped: true }, {
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    const fromEmail = Deno.env.get("FROM_EMAIL") || "Cambridge Studio <noreply@cambridgestudio.com>"

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: Array.isArray(to) ? to : [to],
        subject,
        html: html || undefined,
        text: text || undefined,
      }),
    })

    if (!res.ok) {
      const errorData = await res.text()
      console.error("Resend error:", errorData)
      return Response.json({ error: `Email send failed: ${res.status}` }, {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "*" },
      })
    }

    const data = await res.json()

    return Response.json({ success: true, id: data.id }, {
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    console.error("send-notification-email error:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
})
