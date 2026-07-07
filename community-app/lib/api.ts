import { supabase } from './supabase'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  let token = data.session?.access_token
  if (!token) {
    return { 'Content-Type': 'application/json' }
  }
  try {
    const { data: refreshed } = await supabase.auth.refreshSession()
    if (refreshed.session?.access_token) {
      token = refreshed.session.access_token
    }
  } catch {
  }
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

async function parseJsonSafe(res: Response, url: string): Promise<unknown> {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`API returned non-JSON (HTTP ${res.status}) for ${url}: ${text.slice(0, 200)}`)
  }
}

export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  const url = `${API_URL}${path}`
  const headers = await getAuthHeaders()
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await parseJsonSafe(res, url)
  if (!res.ok) throw new Error((data as Record<string, unknown>).error as string || `API error (${res.status})`)
  return data as T
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const url = `${API_URL}${path}`
  const headers = await getAuthHeaders()
  const res = await fetch(url, { headers })
  const data = await parseJsonSafe(res, url)
  if (!res.ok) throw new Error((data as Record<string, unknown>).error as string || `API error (${res.status})`)
  return data as T
}
