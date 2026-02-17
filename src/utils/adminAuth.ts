const ADMIN_TOKEN_KEY = 'admin_auth_token'
const ADMIN_EXPIRES_KEY = 'admin_auth_expires_at'

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

export function getAdminExpiresAt(): string | null {
  return sessionStorage.getItem(ADMIN_EXPIRES_KEY)
}

export function setAdminSession(token: string, expiresAt: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
  sessionStorage.setItem(ADMIN_EXPIRES_KEY, expiresAt)
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_EXPIRES_KEY)
}
