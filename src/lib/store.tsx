import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useToast } from '../components/ui/Toast'
import { workspaceApi } from './api'
import { addDays, isoDate, uid } from './format'
import { createSeedData, planCatalog, resourceConfigs } from './seed'
import type { AdminData, AuditEntry, ResourceKey, ResourceRecord } from './types'

const storageKey = 'cult-admin-data-v3'

export type StoreMode = 'api' | 'demo'
type Status = 'loading' | 'ready' | 'error'

type AdminStore = {
  mode: StoreMode
  status: Status
  data: AdminData
  reload: () => Promise<void>
  create: (resource: ResourceKey, record: Omit<ResourceRecord, 'id'>) => Promise<{ ok: boolean; meta?: Record<string, string> }>
  update: (resource: ResourceKey, record: ResourceRecord) => Promise<boolean>
  remove: (resource: ResourceKey, ids: string[]) => ResourceRecord[]
  restore: (resource: ResourceKey, records: ResourceRecord[]) => void
  append: (resource: ResourceKey, record: ResourceRecord) => void
  renewMember: (id: string) => Promise<boolean>
  openGate: (id: string, reason: string) => Promise<boolean>
  log: (action: AuditEntry['action'], entity: string, summary: string) => void
  replaceAll: (data: AdminData) => void
  reset: () => void
}

const AdminStoreContext = createContext<AdminStore | null>(null)

const emptyData = (): AdminData => ({
  ...(Object.fromEntries((Object.keys(resourceConfigs) as ResourceKey[]).map((key) => [key, []])) as unknown as Record<ResourceKey, ResourceRecord[]>),
  audit: [],
})

const loadLocal = (): AdminData => {
  const seed = createSeedData()
  const stored = localStorage.getItem(storageKey)
  if (!stored) return seed
  try {
    return { ...seed, ...(JSON.parse(stored) as Partial<AdminData>) }
  } catch {
    return seed
  }
}

export const isAdminData = (value: unknown): value is AdminData => {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return (Object.keys(resourceConfigs) as ResourceKey[]).every((key) => Array.isArray(candidate[key])) && Array.isArray(candidate.audit)
}

const describe = (resource: ResourceKey, record: Partial<ResourceRecord>) =>
  record.name || record.memberName || record.planName || record.invoiceNo || record.key || record.id || resourceConfigs[resource].singular

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Request failed')

export function AdminStoreProvider({ actor, mode, children }: { actor: string; mode: StoreMode; children: ReactNode }) {
  const toast = useToast()
  const [data, setData] = useState<AdminData>(() => (mode === 'demo' ? loadLocal() : emptyData()))
  const [status, setStatus] = useState<Status>(mode === 'demo' ? 'ready' : 'loading')
  const dataRef = useRef(data)
  const auditTimer = useRef(0)

  useEffect(() => {
    dataRef.current = data
    if (mode !== 'demo') return
    const handle = window.setTimeout(() => localStorage.setItem(storageKey, JSON.stringify(data)), 250)
    return () => window.clearTimeout(handle)
  }, [data, mode])

  const reload = useCallback(async () => {
    if (mode === 'demo') return
    setStatus((current) => (current === 'ready' ? current : 'loading'))
    try {
      const loaded = await workspaceApi.load()
      setData({ ...emptyData(), ...loaded })
      setStatus('ready')
    } catch (error) {
      setStatus('error')
      toast({ title: 'Could not load workspace', description: errorMessage(error), tone: 'danger' })
    }
  }, [mode, toast])

  useEffect(() => {
    void reload()
  }, [reload])

  const refreshAudit = useCallback(() => {
    if (mode !== 'api') return
    window.clearTimeout(auditTimer.current)
    auditTimer.current = window.setTimeout(() => {
      workspaceApi.audit().then((audit) => setData((current) => ({ ...current, audit }))).catch(() => undefined)
    }, 600)
  }, [mode])

  const withAudit = useCallback(
    (current: AdminData, action: AuditEntry['action'], entity: string, summary: string): AuditEntry[] =>
      [{ id: uid('audit'), at: new Date().toISOString(), actor, action, entity, summary }, ...current.audit].slice(0, 500),
    [actor],
  )

  const patchResource = useCallback((resource: ResourceKey, fn: (rows: ResourceRecord[]) => ResourceRecord[]) => {
    setData((current) => ({ ...current, [resource]: fn(current[resource]) }))
  }, [])

  const fail = useCallback((title: string, error: unknown) => toast({ title, description: errorMessage(error), tone: 'danger' }), [toast])

  const log = useCallback<AdminStore['log']>((action, entity, summary) => {
    if (mode === 'api') {
      // The server audits its own mutations; only client-side actions (exports) are reported.
      if (action === 'EXPORT') workspaceApi.event(entity, summary).then(refreshAudit).catch(() => undefined)
      return
    }
    setData((current) => ({ ...current, audit: withAudit(current, action, entity, summary) }))
  }, [mode, refreshAudit, withAudit])

  const create = useCallback<AdminStore['create']>(async (resource, record) => {
    const temp = { id: uid(resource), ...record } as ResourceRecord
    if (mode === 'demo') {
      setData((current) => ({
        ...current,
        [resource]: [temp, ...current[resource]],
        audit: withAudit(current, 'CREATE', resource, `Created ${resourceConfigs[resource].singular.toLowerCase()} “${describe(resource, temp)}”`),
      }))
      return { ok: true }
    }
    patchResource(resource, (rows) => [temp, ...rows])
    try {
      const { record: saved, meta } = await workspaceApi.create(resource, record)
      patchResource(resource, (rows) => rows.map((row) => (row.id === temp.id ? saved : row)))
      refreshAudit()
      return { ok: true, ...(meta ? { meta } : {}) }
    } catch (error) {
      patchResource(resource, (rows) => rows.filter((row) => row.id !== temp.id))
      fail(`Could not create ${resourceConfigs[resource].singular.toLowerCase()}`, error)
      return { ok: false }
    }
  }, [fail, mode, patchResource, refreshAudit, withAudit])

  const update = useCallback<AdminStore['update']>(async (resource, record) => {
    const previous = dataRef.current[resource].find((row) => row.id === record.id)
    if (mode === 'demo') {
      setData((current) => ({
        ...current,
        [resource]: current[resource].map((item) => (item.id === record.id ? record : item)),
        audit: withAudit(current, 'UPDATE', resource, `Updated ${resourceConfigs[resource].singular.toLowerCase()} “${describe(resource, record)}”`),
      }))
      return true
    }
    patchResource(resource, (rows) => rows.map((row) => (row.id === record.id ? record : row)))
    try {
      const { record: saved } = await workspaceApi.update(resource, record)
      patchResource(resource, (rows) => rows.map((row) => (row.id === saved.id ? saved : row)))
      refreshAudit()
      return true
    } catch (error) {
      if (previous) patchResource(resource, (rows) => rows.map((row) => (row.id === previous.id ? previous : row)))
      fail(`Could not update ${resourceConfigs[resource].singular.toLowerCase()}`, error)
      return false
    }
  }, [fail, mode, patchResource, refreshAudit, withAudit])

  const remove = useCallback<AdminStore['remove']>((resource, ids) => {
    const idSet = new Set(ids)
    const removed = dataRef.current[resource].filter((item) => idSet.has(item.id))
    setData((current) => ({
      ...current,
      [resource]: current[resource].filter((item) => !idSet.has(item.id)),
      ...(mode === 'demo' ? { audit: withAudit(current, 'DELETE', resource, ids.length === 1 && removed[0] ? `Deleted “${describe(resource, removed[0])}”` : `Deleted ${ids.length} ${resource}`) } : {}),
    }))
    if (mode === 'api') {
      workspaceApi.remove(resource, ids).then(refreshAudit).catch((error) => {
        patchResource(resource, (rows) => [...removed, ...rows])
        fail('Delete failed — records restored', error)
      })
    }
    return removed
  }, [fail, mode, patchResource, refreshAudit, withAudit])

  const restore = useCallback<AdminStore['restore']>((resource, records) => {
    if (mode === 'demo') {
      setData((current) => ({
        ...current,
        [resource]: [...records, ...current[resource].filter((item) => !records.some((record) => record.id === item.id))],
        audit: withAudit(current, 'CREATE', resource, `Restored ${records.length} ${resource} (undo)`),
      }))
      return
    }
    records.forEach(({ id: _id, ...record }) => void create(resource, record))
  }, [create, mode, withAudit])

  const append = useCallback<AdminStore['append']>((resource, record) => {
    setData((current) => ({ ...current, [resource]: [record, ...current[resource].filter((row) => row.id !== record.id)].slice(0, 5000) }))
  }, [])

  const renewMember = useCallback<AdminStore['renewMember']>(async (id) => {
    if (mode === 'api') {
      try {
        const { member, payment } = await workspaceApi.renew(id)
        setData((current) => ({ ...current, members: current.members.map((row) => (row.id === member.id ? member : row)), payments: [payment, ...current.payments] }))
        refreshAudit()
        return true
      } catch (error) {
        fail('Renewal failed', error)
        return false
      }
    }
    setData((current) => {
      const member = current.members.find((item) => item.id === id)
      if (!member) return current
      const plan = planCatalog.find((item) => item.name === member.plan) ?? planCatalog[1]!
      const base = new Date(member.expiry ?? '') > new Date() ? new Date(member.expiry ?? '') : new Date()
      const renewed: ResourceRecord = { ...member, expiry: isoDate(addDays(base, plan.days)), status: member.status === 'Biometric Pending' ? member.status : 'Active' }
      const invoiceNo = `INV-${new Date().getFullYear()}-${String(current.payments.length + 1).padStart(4, '0')}`
      return {
        ...current,
        members: current.members.map((item) => (item.id === id ? renewed : item)),
        payments: [{ id: uid('payment'), invoiceNo, memberName: member.name ?? '', amount: String(plan.price), method: 'UPI', status: 'Paid', paidAt: isoDate(new Date()) }, ...current.payments],
        audit: withAudit(current, 'RENEW', 'members', `Renewed ${member.name} on ${plan.name} until ${renewed.expiry} (${invoiceNo})`),
      }
    })
    return true
  }, [fail, mode, refreshAudit, withAudit])

  const openGate = useCallback<AdminStore['openGate']>(async (id, reason) => {
    const gate = dataRef.current.gates.find((row) => row.id === id)
    if (!gate) return false
    if (mode === 'api') {
      try {
        const { record } = await workspaceApi.openGate(id, reason)
        patchResource('gates', (rows) => rows.map((row) => (row.id === id ? record : row)))
        refreshAudit()
        return true
      } catch (error) {
        fail(`Could not open ${gate.name}`, error)
        return false
      }
    }
    setData((current) => ({
      ...current,
      gates: current.gates.map((row) => (row.id === id ? { ...row, lastEvent: new Date().toTimeString().slice(0, 8) } : row)),
      audit: withAudit(current, 'GATE_OPEN', 'gates', `Remote-opened ${gate.name}: ${reason}`),
    }))
    return true
  }, [fail, mode, patchResource, refreshAudit, withAudit])

  const replaceAll = useCallback<AdminStore['replaceAll']>((next) => {
    if (mode === 'api') return
    setData({ ...next, audit: withAudit(next, 'IMPORT', 'workspace', 'Workspace restored from backup file') })
  }, [mode, withAudit])

  const reset = useCallback(() => {
    if (mode === 'api') return
    const seed = createSeedData()
    setData({ ...seed, audit: withAudit(seed, 'RESET', 'workspace', 'Workspace reset to demo data') })
  }, [mode, withAudit])

  const value = useMemo(
    () => ({ mode, status, data, reload, create, update, remove, restore, append, renewMember, openGate, log, replaceAll, reset }),
    [mode, status, data, reload, create, update, remove, restore, append, renewMember, openGate, log, replaceAll, reset],
  )

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>
}

export const useAdminStore = () => {
  const store = useContext(AdminStoreContext)
  if (!store) throw new Error('useAdminStore must be used within AdminStoreProvider')
  return store
}
