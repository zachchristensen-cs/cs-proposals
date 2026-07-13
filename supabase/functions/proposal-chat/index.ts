import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")
const ANTHROPIC_MODEL = Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6"

// Minimal fallback if the DB row has no prompt yet
const DEFAULT_PROMPT = `You are an AI sales engineer. Help the team create project proposals and estimates for clients.`

async function getSystemPrompt(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from("admin_settings")
      .select("system_prompt")
      .limit(1)
      .maybeSingle()

    return data?.system_prompt || DEFAULT_PROMPT
  } catch (err) {
    console.error("Failed to load system prompt:", err)
    return DEFAULT_PROMPT
  }
}

async function getTeamRosterSection(
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from("team_members")
      .select("name, role, bio, initials, photo_url")
      .order("sort_order", { ascending: true })

    if (!data?.length) return ""

    const lines = data.map((m, i) => {
      const photo = m.photo_url ? `, photo_url: ${m.photo_url}` : ""
      const bio = m.bio ? `\n   Bio: ${m.bio}` : ""
      return `${i + 1}. ${m.name} (${m.role}, initials: ${m.initials}${photo})${bio}`
    })

    return `\n\n## Team Members

This roster is managed in the app's Settings and is the single source of truth. When including the team section, use exactly these people:

${lines.join("\n")}

Use the exact names, roles, initials, and photo_url values as provided, and include photo_url on each team member in the JSON when one is listed. Do NOT invent team members. If a bio is provided, use it verbatim; only write a brief bio yourself when none is provided.`
  } catch (err) {
    console.error("Failed to load team members:", err)
    return ""
  }
}

function buildSystemPrompt(
  productSpec: string,
  options: {
    currentContent?: Record<string, unknown>
  },
): string {
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
  let prompt =
    productSpec +
    `\n\nToday's date is ${today}. Always use this as the cover date when generating a new proposal.

HARD RULE: Never use em dashes (—) or double hyphens (--) anywhere: not in chat responses and not in any proposal content field (descriptions, narratives, bullets, notes, etc.). Rewrite the sentence with a comma, period, colon, or parentheses instead.

HARD RULE: Every proposal must include the "team" section, populated with the full roster from the Team Members list, regardless of tier.

HARD RULE: Payment terms are always exactly three installments calculated from the total estimate: 50% at kickoff, 25% at design approval, and 25% at pre-launch sign-off. Label them "Kickoff", "Design approval", and "Pre-launch sign-off". The three amounts must sum to the total.

`

  if (options.currentContent) {
    prompt += `The current proposal JSON is below. When asked for changes, return the COMPLETE updated proposal JSON wrapped in <proposal_update> tags. Always recalculate prices and totals when amounts change. Include ALL sections in the returned JSON, even ones that didn't change. Preserve display flags like "hide_total" and per-phase "hide_price" exactly as they appear unless explicitly asked to change them.

<current_proposal>
${JSON.stringify(options.currentContent, null, 2)}
</current_proposal>
`
  } else {
    prompt += `No proposal has been generated yet. Gather information through conversation before generating. When you have enough information to generate a proposal, return the complete proposal JSON wrapped in <proposal_update> tags along with your conversational response.

When generating, also include the following top-level fields for the database record:
- client_name: string
- tier: 1, 2, or 3

CRITICAL: Return the JSON with all fields at the TOP LEVEL of the object. Do NOT wrap them inside a "content" key. The correct format is:
{
  "client_name": "...",
  "tier": 2,
  "cover": { ... },
  "phases": [ ... ],
  ...
}

The ProposalContent JSON schema:
{
  "cover": { "client_name": string, "prepared_for?": string, "date": string, "timeline?": string, "description": string },
  "opportunity?": { "paragraphs": string[] },
  "personas?": { "intro?": string, "items": [{ "title": string, "description": string }] },
  "phases": [{
    "name": string,
    "timeline?": string,
    "price": number,
    "subtotal": number,
    "hide_price?": boolean,
    "narrative?": string,
    "groups?": [{ "name": string, "items": string[] }],
    "items": []
  }],
  "total": number,
  "hide_total?": boolean,
  "payment": { "terms": [{ "label": string, "amount": number, "description": string }] },
  "maintenance?": { "tiers": [{ "name": string, "price": string, "summary": string, "description": string }], "recommendation?": string },
  "team?": { "intro": string, "members": [{ "name": string, "role": string, "bio": string, "initials": string, "photo_url?": string }] },
  "notes?": { "items": string[] },
  "timing_note?": string
}

IMPORTANT: For phases, prefer using "groups" (sub-headings with bullet lists) over individually priced "items". Set "items" to an empty array [] when using groups. The "price" and "subtotal" on each phase should be the same value: the total cost for that phase. The "total" field must equal the sum of all phase prices. A phase's "hide_price" only hides the price display next to the phase name; the phase still counts toward "total". Preserve this flag when updating phases.
`
  }

  return prompt
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return Response.json(
        { error: "Missing authorization" },
        { status: 401, headers: corsHeaders },
      )
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    // Verify the user is admin/member
    const supabaseUser = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const {
      data: { user },
    } = await supabaseUser.auth.getUser()

    if (!user) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401, headers: corsHeaders },
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const { data: roleData } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!roleData || !["admin", "member"].includes(roleData.role)) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403, headers: corsHeaders },
      )
    }

    if (!ANTHROPIC_API_KEY) {
      return Response.json(
        { error: "Anthropic API key not configured" },
        { status: 500, headers: corsHeaders },
      )
    }

    const { messages, proposal_id, current_content } = await req.json()

    // If editing an existing proposal, load its content
    let proposalContent = current_content

    if (proposal_id && !current_content) {
      const { data } = await supabaseAdmin
        .from("proposals")
        .select("content")
        .eq("id", proposal_id)
        .eq("created_by", user.id)
        .single()

      if (!data) {
        return Response.json(
          { error: "Proposal not found" },
          { status: 404, headers: corsHeaders },
        )
      }

      proposalContent = data.content
    }

    // Load the system prompt from admin_settings and the team roster
    const [productSpec, teamRoster] = await Promise.all([
      getSystemPrompt(supabaseAdmin),
      getTeamRosterSection(supabaseAdmin),
    ])

    const systemPrompt = buildSystemPrompt(productSpec + teamRoster, {
      currentContent: proposalContent,
    })

    // Call Anthropic streaming API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 8096,
        stream: true,
        system: systemPrompt,
        messages: messages.map(
          (m: { role: string; content: string | unknown[] }) => ({
            role: m.role,
            content: m.content,
          }),
        ),
      }),
    })

    if (!response.ok) {
      if (response.status === 429) {
        return Response.json(
          { error: "Rate limit reached. Please wait a moment and try again." },
          { status: 429, headers: corsHeaders },
        )
      }
      const errorText = await response.text()
      console.error("Anthropic API error:", response.status, errorText)
      return Response.json(
        { error: `Anthropic ${response.status}: ${errorText}` },
        { status: 500, headers: corsHeaders },
      )
    }

    // Stream the response through to the client
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const readable = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader()
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue
              const data = line.slice(6).trim()
              if (data === "[DONE]") continue

              try {
                const event = JSON.parse(data)
                if (
                  event.type === "content_block_delta" &&
                  event.delta?.type === "text_delta" &&
                  event.delta.text
                ) {
                  controller.enqueue(encoder.encode(event.delta.text))
                } else if (event.type === "error") {
                  console.error("Anthropic stream error:", JSON.stringify(event))
                  controller.enqueue(
                    encoder.encode(
                      "Sorry, something went wrong. Please try again.",
                    ),
                  )
                }
              } catch {
                // Skip malformed JSON lines
              }
            }
          }

          // Flush any remaining buffer content
          if (buffer.trim()) {
            const remaining = buffer.trim()
            if (remaining.startsWith("data: ")) {
              const data = remaining.slice(6).trim()
              if (data !== "[DONE]") {
                try {
                  const event = JSON.parse(data)
                  if (
                    event.type === "content_block_delta" &&
                    event.delta?.type === "text_delta" &&
                    event.delta.text
                  ) {
                    controller.enqueue(encoder.encode(event.delta.text))
                  }
                } catch {
                  // Skip malformed trailing data
                }
              }
            }
          }
        } catch (err) {
          console.error("Stream error:", err)
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : ""
    console.error("proposal-chat error:", errMsg)
    console.error("proposal-chat stack:", errStack)
    return Response.json(
      { error: `An error occurred: ${errMsg}` },
      { status: 500, headers: corsHeaders },
    )
  }
})
