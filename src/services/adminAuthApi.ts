import { clearAdminSession, getAdminToken } from '../utils/adminAuth'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export type AdminRole = 'SuperAdmin' | 'SD' | 'ITMS'

export type AdminUser = {
  id: string
  email: string
  name: string | null
  role: AdminRole
  totpEnabled: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export type LoginResponse =
  | {
      status: 'authenticated'
      sessionToken: string
      sessionExpiresAt: string
      user: AdminUser
    }
  | {
      status: '2fa_required'
      sessionToken: string
      sessionExpiresAt: string
      user: AdminUser
    }
  | {
      status: '2fa_setup'
      sessionToken: string
      sessionExpiresAt: string
      user: AdminUser
      otpauthUrl: string
      secret: string
    }

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {})
  const token = getAdminToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(path, { ...options, headers })
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const data = (await response.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // ignore
    }
    throw new Error(message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const response = await authFetch<LoginResponse>(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return response
}

export async function verifyTwoFactor(
  code: string
): Promise<{ user: AdminUser; sessionExpiresAt: string }> {
  const response = await authFetch<{ user: AdminUser; sessionExpiresAt: string }>(
    `${API_BASE}/admin/2fa/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    }
  )
  return response
}

export async function getMe(): Promise<{ user: AdminUser; sessionExpiresAt: string | null }> {
  return authFetch<{ user: AdminUser; sessionExpiresAt: string | null }>(
    `${API_BASE}/admin/me`
  )
}

export async function listAdminUsers(): Promise<{ users: AdminUser[] }> {
  return authFetch<{ users: AdminUser[] }>(`${API_BASE}/admin/users`)
}

export async function createAdminUser(payload: {
  email: string
  password: string
  name?: string
  role?: AdminRole
}): Promise<{ user: AdminUser }> {
  return authFetch<{ user: AdminUser }>(`${API_BASE}/admin/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminUser(id: string): Promise<void> {
  await authFetch<void>(`${API_BASE}/admin/users/${id}`, { method: 'DELETE' })
}

export async function logout(): Promise<void> {
  try {
    await authFetch<void>(`${API_BASE}/admin/logout`, { method: 'POST' })
  } finally {
    clearAdminSession()
  }
}
