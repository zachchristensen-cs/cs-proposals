import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single()

    if (!roleData || !["admin", "member"].includes(roleData.role)) {
      return Response.json(
        { error: "Forbidden" },
        { status: 403, headers: corsHeaders },
      )
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const proposalId = formData.get("proposal_id") as string | null

    if (!file) {
      return Response.json(
        { error: "No file provided" },
        { status: 400, headers: corsHeaders },
      )
    }

    const folder = proposalId ?? `temp-${crypto.randomUUID().slice(0, 8)}`
    const filePath = `${folder}/${file.name}`

    // Upload to storage
    const buffer = await file.arrayBuffer()
    const { error: uploadError } = await supabaseAdmin.storage
      .from("proposal-attachments")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      return Response.json(
        { error: "Upload failed: " + uploadError.message },
        { status: 500, headers: corsHeaders },
      )
    }

    // Extract text content based on file type
    let extractedText: string | undefined
    let base64: string | undefined

    if (
      file.type.startsWith("text/") ||
      file.name.endsWith(".md") ||
      file.name.endsWith(".csv")
    ) {
      extractedText = new TextDecoder().decode(buffer)
    } else if (file.type === "application/pdf") {
      // Convert to base64 for Claude's native PDF support
      const bytes = new Uint8Array(buffer)
      let binary = ""
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      base64 = btoa(binary)
      extractedText = `[Attached PDF: ${file.name}]`
    } else if (file.type.startsWith("image/")) {
      // Return base64 for Claude vision
      const bytes = new Uint8Array(buffer)
      let binary = ""
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      base64 = btoa(binary)
      extractedText = `[Attached image: ${file.name}]`
    } else {
      extractedText = `[Uploaded file: ${file.name} — content type not supported for text extraction]`
    }

    return Response.json(
      {
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        extracted_text: extractedText,
        base64,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error("proposal-upload error:", error)
    return Response.json(
      { error: "Upload failed. Please try again." },
      { status: 500, headers: corsHeaders },
    )
  }
})
