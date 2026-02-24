import { supabase } from './supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Call a Supabase Edge Function and return the raw response stream.
 * Used for streaming chat responses from Claude.
 */
export async function streamEdgeFunction(
  functionName: string,
  body: Record<string, unknown>,
): Promise<{ stream: ReadableStream<Uint8Array> | null; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    return { stream: null, error: 'Session expired. Please log in again.' }
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      if (res.status === 429) {
        return { stream: null, error: 'Rate limit reached. Please wait a moment and try again.' }
      }
      const errorData = await res.json().catch(() => ({}))
      return { stream: null, error: (errorData as { error?: string }).error ?? `Request failed (${res.status})` }
    }

    if (!res.body) {
      return { stream: null, error: 'No response body' }
    }

    return { stream: res.body, error: null }
  } catch (err) {
    return { stream: null, error: `Network error: ${err}` }
  }
}
