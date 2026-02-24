import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Call a Supabase Edge Function with a fresh access token.
 * Handles token refresh, CORS headers, and error extraction.
 */
export async function callEdgeFunction<T = Record<string, unknown>>(
  functionName: string,
  body: Record<string, unknown>,
  options?: { requireAuth?: boolean },
): Promise<{ data: T | null; error: string | null }> {
  const requireAuth = options?.requireAuth ?? true
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: supabaseAnonKey,
  }

  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      return { data: null, error: 'Session expired. Please log in again.' }
    }
    headers['Authorization'] = `Bearer ${session.access_token}`
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok || data?.error) {
      return { data: null, error: data?.error ?? `Request failed (${res.status})` }
    }

    return { data: data as T, error: null }
  } catch (err) {
    return { data: null, error: `Network error: ${err}` }
  }
}
