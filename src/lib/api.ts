import type { AdminData, ResourceKey, ResourceRecord, SessionUser } from './types'

// Empty string = same origin (production on Vercel proxies /api/* to the backend).
export const apiBaseUrl: string = import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? 'http://localhost:4000' : '')
export const socketUrl: string = import.meta.env.VITE_SOCKET_URL || apiBaseUrl || window.location.origin

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
export const getAccessToken = () => accessToken

let sessionExpiredHandler: (() => void) | null = null
export const onSessionExpired = (handler: (() => void) | null) => {
  sessionExpiredHandler = handler
}

let refreshInFlight: Promise<boolean> | null = null

/** Single-flight refresh so parallel 401s trigger only one rotation of the refresh cookie. */
export function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (!response.ok) return false
      const payload = await response.json()
      accessToken = payload?.data?.accessToken ?? null
      return Boolean(accessToken)
    } catch {
      return false
    } finally {
      window.setTimeout(() => { refreshInFlight = null }, 0)
    }
  })()
  return refreshInFlight
}

export async function apiFetch<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers, credentials: 'include' })
  if (response.status === 401 && accessToken && !retried && !path.startsWith('/api/v1/auth/')) {
    if (await refreshAccessToken()) return apiFetch<T>(path, init, true)
    accessToken = null
    sessionExpiredHandler?.()
  }
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

let restoreInFlight: Promise<SessionUser | null> | null = null

export function restoreSession(): Promise<SessionUser | null> {
  restoreInFlight ??= restoreSessionOnce().finally(() => window.setTimeout(() => { restoreInFlight = null }, 0))
  return restoreInFlight
}

async function restoreSessionOnce(): Promise<SessionUser | null> {
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

export type AccessDecisionPayload = {
  eventId: string
  result: 'ALLOWED' | 'DENIED' | 'ERROR'
  reason: string
  occurredAt: string
  memberName?: string
  memberCode?: string
  gateName?: string
}

export async function simulateFingerprint() {
  return apiFetch<AccessDecisionPayload>('/api/v1/access/simulate-fingerprint', { method: 'POST' })
}

const json = (body: unknown) => JSON.stringify(body)
const withoutId = ({ id: _id, ...rest }: ResourceRecord) => rest

export const workspaceApi = {
  load: () => apiFetch<AdminData>('/api/v1/workspace'),
  audit: () => apiFetch<AdminData['audit']>('/api/v1/workspace/audit'),
  create: (resource: ResourceKey, record: Omit<ResourceRecord, 'id'>) =>
    apiFetch<{ record: ResourceRecord; meta?: Record<string, string> }>(`/api/v1/workspace/${resource}`, { method: 'POST', body: json(record) }),
  update: (resource: ResourceKey, record: ResourceRecord) =>
    apiFetch<{ record: ResourceRecord }>(`/api/v1/workspace/${resource}/${record.id}`, { method: 'PATCH', body: json(withoutId(record)) }),
  remove: (resource: ResourceKey, ids: string[]) =>
    apiFetch<{ deleted: number }>(`/api/v1/workspace/${resource}/bulk-delete`, { method: 'POST', body: json({ ids }) }),
  renew: (memberId: string) =>
    apiFetch<{ member: ResourceRecord; payment: ResourceRecord }>(`/api/v1/workspace/members/${memberId}/renew`, { method: 'POST', body: json({ method: 'UPI' }) }),
  openGate: (gateId: string, reason: string) =>
    apiFetch<{ record: ResourceRecord }>(`/api/v1/workspace/gates/${gateId}/open`, { method: 'POST', body: json({ reason }) }),
  event: (entity: string, summary: string) => apiFetch('/api/v1/workspace/events', { method: 'POST', body: json({ entity, summary }) }),
}

export async function submitQuery(form: Record<string, string>) {
  return apiFetch<{ delivered: boolean }>('/api/v1/contact/query', { method: 'POST', body: JSON.stringify(form) })
}
