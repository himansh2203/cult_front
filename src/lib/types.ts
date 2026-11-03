export type ResourceKey =
  | 'members'
  | 'memberships'
  | 'payments'
  | 'attendance'
  | 'biometrics'
  | 'devices'
  | 'gates'
  | 'trainers'
  | 'staff'
  | 'settings'

export type AdminTab = 'dashboard' | ResourceKey | 'reports' | 'audit'

export type ResourceRecord = Record<string, string> & { id: string }

export type AuditEntry = {
  id: string
  at: string
  actor: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'GATE_OPEN' | 'ENROLL' | 'EXPORT' | 'IMPORT' | 'RENEW' | 'RESET'
  entity: string
  summary: string
}

export type AdminData = Record<ResourceKey, ResourceRecord[]> & { audit: AuditEntry[] }

export type FieldConfig = {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'number' | 'date' | 'email' | 'tel' | 'select' | 'time'
  options?: string[]
  required?: boolean
  pattern?: string
  hint?: string
}

export type ResourceConfig = {
  title: string
  singular: string
  kicker: string
  description: string
  fields: FieldConfig[]
  columns: string[]
  statusKey?: string
  searchKeys: string[]
}

export type AccessEvent = {
  id: string
  at: string
  member: string
  memberCode: string
  gate: string
  result: 'GRANTED' | 'DENIED'
  reason: string
  confidence: number
}

export type SessionUser = {
  id: string
  name: string
  email: string
  roles: string[]
  mode: 'api' | 'demo'
}
