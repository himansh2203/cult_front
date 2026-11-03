import type { SessionUser } from './types'

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

// Demo credentials are only compiled into dev builds; production bundles never contain them.
const demoCredentials = import.meta.env.DEV && import.meta.env.VITE_ADMIN_LOGIN_ID && import.meta.env.VITE_ADMIN_PASSWORD
  ? { loginId: String(import.meta.env.VITE_ADMIN_LOGIN_ID), password: String(import.meta.env.VITE_ADMIN_PASSWORD) }
  : null

const demoSessionKey = 'cult-demo-session'
let accessToken: string | null = null

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const isDemoAvailable = () => demoCredentials !== null

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, credentials: 'include' })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(payload?.error?.message || `Request failed (${response.status})`, response.status)
  }
  return (payload?.data ?? payload) as T
}

type AuthPayload = { accessToken: string; user: { id: string; name: string; email: string; roles: string[] } }

const toSession = (payload: AuthPayload): SessionUser => {
  accessToken = payload.accessToken
  return { ...payload.user, mode: 'api' }
}

export async function login(loginId: string, password: string): Promise<SessionUser> {
  try {
    return toSession(await apiFetch<AuthPayload>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ email: loginId, password }) }))
  } catch (error) {
    const backendUnreachable = !(error instanceof ApiError) || error.status === 404 || error.status >= 500
    if (backendUnreachable && demoCredentials && loginId.trim() === demoCredentials.loginId && password === demoCredentials.password) {
      const user: SessionUser = { id: 'demo-owner', name: 'Owner (demo)', email: loginId.trim(), roles: ['OWNER'], mode: 'demo' }
      sessionStorage.setItem(demoSessionKey, JSON.stringify(user))
      return user
    }
    if (error instanceof ApiError && error.status === 401) throw new Error('Invalid login ID or password.')
    if (backendUnreachable) throw new Error(demoCredentials ? 'API offline and demo credentials did not match.' : 'Authentication service is unreachable. Please try again shortly.')
    throw error
  }
}

export async function restoreSession(): Promise<SessionUser | null> {
  const demo = sessionStorage.getItem(demoSessionKey)
  if (demo && demoCredentials) {
    try {
      return JSON.parse(demo) as SessionUser
    } catch {
      sessionStorage.removeItem(demoSessionKey)
    }
  }
  try {
    return toSession(await apiFetch<AuthPayload>('/api/v1/auth/refresh', { method: 'POST' }))
  } catch {
    return null
  }
}

export async function logout() {
  sessionStorage.removeItem(demoSessionKey)
  try {
    if (accessToken) await apiFetch('/api/v1/auth/logout', { method: 'POST' })
  } catch {
    // Session is cleared locally regardless of API reachability.
  } finally {
    accessToken = null
  }
}

export async function simulateFingerprint() {
  return apiFetch<{ result: 'ALLOWED' | 'DENIED'; reason: string; eventId: string }>('/api/v1/access/simulate-fingerprint', { method: 'POST' })
}

export async function submitQuery(form: Record<string, string>) {
  return apiFetch<{ delivered: boolean }>('/api/v1/contact/query', { method: 'POST', body: JSON.stringify(form) })
}
