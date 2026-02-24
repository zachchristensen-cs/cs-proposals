import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const SYSTEM_PROMPT = `You are a project manager at a web agency. Your job is to take a client's raw maintenance request and turn it into a structured, professional development ticket.

You MUST respond with valid JSON in exactly this format:
{
  "success": true,
  "title": "Concise ticket title (max 80 chars)",
  "processed_content": "<h2>Summary</h2><p>...</p><h2>Requirements</h2><ul><li>...</li></ul><h2>Acceptance Criteria</h2><ul><li>...</li></ul>"
}

OR if the request is too vague or insufficient:
{
  "success": false,
  "rejection_reason": "Brief explanation of what additional information is needed"
}

Rules for structuring the ticket:
- Generate a concise, descriptive title
- The processed_content must be valid HTML
- Include these sections as appropriate: Summary, Requirements, Acceptance Criteria, Notes
- Use <h2> for section headings
- Use <ul>/<li> for bullet lists, <ol>/<li> for numbered lists
- Use <strong> for emphasis, <code> for technical terms
- Use <table> with <thead>/<tbody> for tabular data if relevant
- Be specific and actionable
- Preserve all URLs, page names, and technical details from the original request
- If the request mentions multiple changes, break them into clear separate items
- Reject requests that are extremely vague (e.g., "make it better", "fix stuff") with a helpful reason`

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { raw_message } = await req.json()

    if (!raw_message || typeof raw_message !== "string") {
      return Response.json(
        { success: false, rejection_reason: "Message is required" },
        { status: 400, headers: corsHeaders },
      )
    }

    if (raw_message.length > 5000) {
      return Response.json(
        { success: false, rejection_reason: "Message exceeds 5000 character limit" },
        { status: 400, headers: corsHeaders },
      )
    }

    if (raw_message.trim().length < 10) {
      return Response.json({
        success: false,
        rejection_reason: "Please provide more detail about your request. What specific changes do you need?",
      }, { headers: corsHeaders })
    }

    // Try Anthropic first, then OpenAI
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")
    const openaiKey = Deno.env.get("OPENAI_API_KEY")

    let result: { success: boolean; title?: string; processed_content?: string; rejection_reason?: string }

    if (anthropicKey) {
      result = await callAnthropic(anthropicKey, raw_message)
    } else if (openaiKey) {
      result = await callOpenAI(openaiKey, raw_message)
    } else {
      // Fallback: simple structuring without AI
      result = fallbackProcess(raw_message)
    }

    return Response.json(result, { headers: corsHeaders })
  } catch (error) {
    console.error("process-ticket error:", error)
    return Response.json(
      { success: false, rejection_reason: "An error occurred processing your request" },
      { status: 500, headers: corsHeaders },
    )
  }
})

async function callAnthropic(
  apiKey: string,
  rawMessage: string,
): Promise<{ success: boolean; title?: string; processed_content?: string; rejection_reason?: string }> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Process this client maintenance request:\n\n${rawMessage}`,
        },
      ],
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ""
  return parseAIResponse(text)
}

async function callOpenAI(
  apiKey: string,
  rawMessage: string,
): Promise<{ success: boolean; title?: string; processed_content?: string; rejection_reason?: string }> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Process this client maintenance request:\n\n${rawMessage}`,
        },
      ],
      max_tokens: 2048,
      temperature: 0.3,
    }),
  })

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content ?? ""
  return parseAIResponse(text)
}

function parseAIResponse(
  text: string,
): { success: boolean; title?: string; processed_content?: string; rejection_reason?: string } {
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("No JSON found")
    return JSON.parse(jsonMatch[0])
  } catch {
    // If parsing fails, treat the response as processed content
    return {
      success: true,
      title: "Maintenance Request",
      processed_content: `<h2>Summary</h2><p>${text}</p>`,
    }
  }
}

function fallbackProcess(
  rawMessage: string,
): { success: boolean; title?: string; processed_content?: string } {
  // Simple fallback when no AI key is configured
  const firstLine = rawMessage.split("\n")[0].slice(0, 80)
  const title = firstLine.length > 60 ? firstLine.slice(0, 60) + "..." : firstLine

  const paragraphs = rawMessage
    .split("\n\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim()}</p>`)
    .join("")

  return {
    success: true,
    title,
    processed_content: `<h2>Summary</h2>${paragraphs}<h2>Requirements</h2><ul><li>Review and address the request described above</li></ul>`,
  }
}
