import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { addDays, isoDate, uid } from './format'
import { createSeedData, planCatalog, resourceConfigs } from './seed'
import type { AdminData, AuditEntry, ResourceKey, ResourceRecord } from './types'

const storageKey = 'cult-admin-data-v3'

type AdminStore = {
  data: AdminData
  create: (resource: ResourceKey, record: Omit<ResourceRecord, 'id'>) => ResourceRecord
  update: (resource: ResourceKey, record: ResourceRecord) => void
  remove: (resource: ResourceKey, ids: string[]) => ResourceRecord[]
  restore: (resource: ResourceKey, records: ResourceRecord[]) => void
  append: (resource: ResourceKey, record: ResourceRecord) => void
  renewMember: (id: string) => void
  log: (action: AuditEntry['action'], entity: string, summary: string) => void
  replaceAll: (data: AdminData) => void
  reset: () => void
}

const AdminStoreContext = createContext<AdminStore | null>(null)

const loadData = (): AdminData => {
  const seed = createSeedData()
  const stored = localStorage.getItem(storageKey)
  if (!stored) return seed
  try {
    const parsed = JSON.parse(stored) as Partial<AdminData>
    return { ...seed, ...parsed }
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

export function AdminStoreProvider({ actor, children }: { actor: string; children: ReactNode }) {
  const [data, setData] = useState<AdminData>(loadData)

  useEffect(() => {
    const handle = window.setTimeout(() => localStorage.setItem(storageKey, JSON.stringify(data)), 250)
    return () => window.clearTimeout(handle)
  }, [data])

  const withAudit = useCallback(
    (current: AdminData, action: AuditEntry['action'], entity: string, summary: string): AuditEntry[] =>
      [{ id: uid('audit'), at: new Date().toISOString(), actor, action, entity, summary }, ...current.audit].slice(0, 500),
    [actor],
  )

  const log = useCallback<AdminStore['log']>((action, entity, summary) => {
    setData((current) => ({ ...current, audit: withAudit(current, action, entity, summary) }))
  }, [withAudit])

  const create = useCallback<AdminStore['create']>((resource, record) => {
    const created = { id: uid(resource), ...record } as ResourceRecord
    setData((current) => ({
      ...current,
      [resource]: [created, ...current[resource]],
      audit: withAudit(current, 'CREATE', resource, `Created ${resourceConfigs[resource].singular.toLowerCase()} “${describe(resource, created)}”`),
    }))
    return created
  }, [withAudit])

  const update = useCallback<AdminStore['update']>((resource, record) => {
    setData((current) => ({
      ...current,
      [resource]: current[resource].map((item) => (item.id === record.id ? record : item)),
      audit: withAudit(current, 'UPDATE', resource, `Updated ${resourceConfigs[resource].singular.toLowerCase()} “${describe(resource, record)}”`),
    }))
  }, [withAudit])

  const remove = useCallback<AdminStore['remove']>((resource, ids) => {
    const idSet = new Set(ids)
    const removed = data[resource].filter((item) => idSet.has(item.id))
    setData((current) => ({
      ...current,
      [resource]: current[resource].filter((item) => !idSet.has(item.id)),
      audit: withAudit(current, 'DELETE', resource, ids.length === 1 && removed[0] ? `Deleted “${describe(resource, removed[0])}”` : `Deleted ${ids.length} ${resource}`),
    }))
    return removed
  }, [data, withAudit])

  const restore = useCallback<AdminStore['restore']>((resource, records) => {
    setData((current) => ({
      ...current,
      [resource]: [...records, ...current[resource].filter((item) => !records.some((record) => record.id === item.id))],
      audit: withAudit(current, 'CREATE', resource, `Restored ${records.length} ${resource} (undo)`),
    }))
  }, [withAudit])

  const append = useCallback<AdminStore['append']>((resource, record) => {
    setData((current) => ({ ...current, [resource]: [record, ...current[resource]].slice(0, 2000) }))
  }, [])

  const renewMember = useCallback<AdminStore['renewMember']>((id) => {
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
  }, [withAudit])

  const replaceAll = useCallback<AdminStore['replaceAll']>((next) => {
    setData({ ...next, audit: withAudit(next, 'IMPORT', 'workspace', 'Workspace restored from backup file') })
  }, [withAudit])

  const reset = useCallback(() => {
    const seed = createSeedData()
    setData({ ...seed, audit: withAudit(seed, 'RESET', 'workspace', 'Workspace reset to demo data') })
  }, [withAudit])

  const value = useMemo(() => ({ data, create, update, remove, restore, append, renewMember, log, replaceAll, reset }), [data, create, update, remove, restore, append, renewMember, log, replaceAll, reset])

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>
}

export const useAdminStore = () => {
  const store = useContext(AdminStoreContext)
  if (!store) throw new Error('useAdminStore must be used within AdminStoreProvider')
  return store
}
