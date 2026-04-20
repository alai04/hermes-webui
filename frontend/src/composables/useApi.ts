/**
 * Thin fetch wrapper with credentials:include.
 * Returns parsed JSON or throws with an error message.
 * Handles 401 → redirect to /login.
 */

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

export async function apiFetch(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  if (res.status === 401) {
    // Auth required — redirect to login page
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login'
    }
    throw new ApiError('Unauthorized', 401)
  }

  // Attempt to parse JSON even on error responses (they carry { "error": "..." })
  let data: any
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    data = await res.json()
  } else {
    // Non-JSON response (e.g. plain text error)
    const text = await res.text()
    data = { error: text }
  }

  if (!res.ok) {
    const message = data?.error ?? `HTTP ${res.status}`
    throw new ApiError(message, res.status)
  }

  return data
}

export async function apiGet(
  path: string,
  params?: Record<string, string>
): Promise<any> {
  let url = path
  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString()
    url = `${path}?${qs}`
  }
  return apiFetch(url, { method: 'GET' })
}

export async function apiPost(path: string, body: unknown): Promise<any> {
  return apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
