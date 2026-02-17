import { create } from 'zustand'
import type { AdminUser, LoginResponse } from '../services/adminAuthApi'
import * as adminAuthApi from '../services/adminAuthApi'
import {
  clearAdminSession,
  getAdminExpiresAt,
  getAdminToken,
  setAdminSession,
} from '../utils/adminAuth'

type ChallengeState =
  | { type: '2fa_required' }
  | { type: '2fa_setup'; otpauthUrl: string; secret: string }
  | null

interface AdminAuthState {
  user: AdminUser | null
  token: string | null
  expiresAt: string | null
  loading: boolean
  initialized: boolean
  error: string | null
  challenge: ChallengeState
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<LoginResponse>
  verifyTwoFactor: (code: string) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

let logoutTimer: ReturnType<typeof setTimeout> | null = null

function scheduleLogout(
  expiresAt: string | null,
  clearSession: () => void
) {
  if (logoutTimer) {
    clearTimeout(logoutTimer)
    logoutTimer = null
  }
  if (!expiresAt) return
  const delay = new Date(expiresAt).getTime() - Date.now()
  if (Number.isNaN(delay) || delay <= 0) {
    clearSession()
    return
  }
  logoutTimer = setTimeout(() => {
    clearSession()
  }, delay)
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: null,
  token: getAdminToken(),
  expiresAt: getAdminExpiresAt(),
  loading: false,
  initialized: false,
  error: null,
  challenge: null,

  initialize: async () => {
    const token = getAdminToken()
    const expiresAt = getAdminExpiresAt()
    if (!token || !expiresAt) {
      clearAdminSession()
      set({ initialized: true, token: null, expiresAt: null })
      return
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      clearAdminSession()
      set({ initialized: true, token: null, expiresAt: null })
      return
    }

    set({ loading: true })
    try {
      const me = await adminAuthApi.getMe()
      const sessionExpiresAt = me.sessionExpiresAt || expiresAt
      setAdminSession(token, sessionExpiresAt)
      scheduleLogout(sessionExpiresAt, () => {
        clearAdminSession()
        set({ user: null, token: null, expiresAt: null, challenge: null })
      })
      set({
        user: me.user,
        token,
        expiresAt: sessionExpiresAt,
        loading: false,
        initialized: true,
      })
    } catch (error) {
      clearAdminSession()
      set({
        user: null,
        token: null,
        expiresAt: null,
        loading: false,
        initialized: true,
        error: (error as Error).message,
      })
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null, initialized: true })
    try {
      const response = await adminAuthApi.login(email, password)
      setAdminSession(response.sessionToken, response.sessionExpiresAt)
      scheduleLogout(response.sessionExpiresAt, () => {
        clearAdminSession()
        set({ user: null, token: null, expiresAt: null, challenge: null })
      })
      if (response.status === 'authenticated') {
        set({
          user: response.user,
          token: response.sessionToken,
          expiresAt: response.sessionExpiresAt,
          loading: false,
          challenge: null,
          initialized: true,
        })
      } else if (response.status === '2fa_required') {
        set({
          user: response.user,
          token: response.sessionToken,
          expiresAt: response.sessionExpiresAt,
          loading: false,
          challenge: { type: '2fa_required' },
          initialized: true,
        })
      } else {
        set({
          user: response.user,
          token: response.sessionToken,
          expiresAt: response.sessionExpiresAt,
          loading: false,
          challenge: {
            type: '2fa_setup',
            otpauthUrl: response.otpauthUrl,
            secret: response.secret,
          },
          initialized: true,
        })
      }
      return response
    } catch (error) {
      set({ error: (error as Error).message, loading: false, challenge: null, initialized: true })
      throw error
    }
  },

  verifyTwoFactor: async (code) => {
    set({ loading: true, error: null, initialized: true })
    try {
      const response = await adminAuthApi.verifyTwoFactor(code)
      const token = getAdminToken()
      if (token) {
        setAdminSession(token, response.sessionExpiresAt)
        scheduleLogout(response.sessionExpiresAt, () => {
          clearAdminSession()
          set({ user: null, token: null, expiresAt: null, challenge: null })
        })
      }
      set({
        user: response.user,
        loading: false,
        challenge: null,
        expiresAt: response.sessionExpiresAt,
        initialized: true,
      })
    } catch (error) {
      set({ error: (error as Error).message, loading: false, initialized: true })
      throw error
    }
  },

  logout: async () => {
    set({ loading: true })
    await adminAuthApi.logout()
    clearAdminSession()
    if (logoutTimer) {
      clearTimeout(logoutTimer)
      logoutTimer = null
    }
    set({
      user: null,
      token: null,
      expiresAt: null,
      loading: false,
      challenge: null,
      initialized: true,
    })
  },

  clearError: () => set({ error: null }),
}))
