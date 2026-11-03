import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpDown, Check, ChevronLeft, ChevronRight, DoorOpen, Download, Eye, FingerprintPattern, MessageCircle, Pencil, Plus, RefreshCw, Search, Trash, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useToast } from '../components/ui/Toast'
import { Counter } from '../components/ui/Effects'
import { daysUntil, downloadFile, formatDate, initials, inr, isoDate, statusTone, toCsv, toLabel } from '../lib/format'
import { resourceConfigs } from '../lib/seed'
import { useAdminStore } from '../lib/store'
import type { FieldConfig, ResourceKey, ResourceRecord } from '../lib/types'

const pageSize = 12

type Props = {
  resource: ResourceKey
  createSignal: number
  onOpenMember: (id: string) => void
  onEnroll: () => void
  extra?: ReactNode
}

export default function ResourcePage({ resource, createSignal, onOpenMember, onEnroll, extra }: Props) {
  const config = resourceConfigs[resource]
  const { data, create, update, remove, restore, renewMember, log } = useAdminStore()
  const toast = useToast()
  const records = data[resource]
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<ResourceRecord | 'new' | null>(null)
  const [gateTarget, setGateTarget] = useState<ResourceRecord | null>(null)

  useEffect(() => {
    setQuery('')
    setStatus('All')
    setSort(null)
    setPage(0)
    setSelected(new Set())
  }, [resource])

  useEffect(() => {
    if (createSignal > 0) setEditing('new')
  }, [createSignal])

  const statusOptions = useMemo(() => {
    if (!config.statusKey) return []
    return ['All', ...Array.from(new Set(records.map((record) => record[config.statusKey!] ?? '').filter(Boolean)))]
  }, [records, config.statusKey])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    let rows = records.filter((record) => (status === 'All' || record[config.statusKey ?? ''] === status) && (!term || config.searchKeys.some((key) => (record[key] ?? '').toLowerCase().includes(term))))
    if (sort) {
      const numeric = rows.every((row) => row[sort.key] === '' || !Number.isNaN(Number(row[sort.key])))
      rows = [...rows].sort((a, b) => {
        const left = a[sort.key] ?? ''
        const right = b[sort.key] ?? ''
        return (numeric ? Number(left) - Number(right) : left.localeCompare(right, 'en', { numeric: true })) * sort.dir
      })
    }
    return rows
  }, [records, query, status, sort, config])

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pages - 1)
  const visible = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize)
  const allVisibleSelected = visible.length > 0 && visible.every((record) => selected.has(record.id))

  const toggleSort = (key: string) => setSort((current) => (current?.key === key ? (current.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }))

  const toggleAll = () => setSelected((current) => {
    const next = new Set(current)
    visible.forEach((record) => (allVisibleSelected ? next.delete(record.id) : next.add(record.id)))
    return next
  })

  const toggleOne = (id: string) => setSelected((current) => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const deleteRecords = (ids: string[]) => {
    const removed = remove(resource, ids)
    setSelected(new Set())
    toast({ title: `${ids.length} ${ids.length === 1 ? config.singular.toLowerCase() : resource} deleted`, tone: 'danger', action: { label: 'Undo', onClick: () => restore(resource, removed) } })
  }

  const exportRows = (rows: ResourceRecord[], label: string) => {
    const columns = config.fields.map((field) => field.key)
    downloadFile(`cult-${resource}-${label}-${isoDate(new Date())}.csv`, toCsv(rows, columns))
    log('EXPORT', resource, `Exported ${rows.length} ${resource} (${label})`)
    toast({ title: 'Export ready', description: `${rows.length} rows downloaded as CSV`, tone: 'ok' })
  }

  const saveRecord = (values: Omit<ResourceRecord, 'id'>) => {
    if (editing && editing !== 'new') {
      update(resource, { ...editing, ...values })
      toast({ title: `${config.singular} updated`, tone: 'ok' })
    } else {
      create(resource, values)
      toast({ title: `${config.singular} created`, tone: 'ok' })
    }
    setEditing(null)
  }

  const openGate = (gate: ResourceRecord, reason: string) => {
    const now = new Date()
    update(resource, { ...gate, lastEvent: now.toTimeString().slice(0, 8) })
    log('GATE_OPEN', 'gates', `Remote-opened ${gate.name}: ${reason}`)
    toast({ title: `${gate.name} opened`, description: 'Relay pulsed for 5 seconds · logged to audit trail', tone: 'ok' })
    setGateTarget(null)
  }

  const counts = statusOptions.slice(1).map((option) => ({ option, count: records.filter((record) => record[config.statusKey ?? ''] === option).length }))

  return (
    <div className="resource">
      <header className="page-head">
        <div>
          <p className="kicker">{config.kicker}</p>
          <h1>{config.title}</h1>
          <p className="page-sub">{config.description}</p>
        </div>
        <div className="page-actions">
          {resource === 'biometrics' && <button type="button" className="btn ghost" onClick={onEnroll}><FingerprintPattern size={16} /> Enroll fingerprint</button>}
          <button type="button" className="btn ghost" onClick={() => exportRows(filtered, 'filtered')}><Download size={16} /> Export</button>
          <button type="button" className="btn primary" onClick={() => setEditing('new')}><Plus size={16} /> New {config.singular.toLowerCase()}</button>
        </div>
      </header>

      <section className="stat-strip">
        <button type="button" className={`stat ${status === 'All' ? 'active' : ''}`} onClick={() => { setStatus('All'); setPage(0) }}>
          <span>Total</span><strong><Counter value={records.length} /></strong>
        </button>
        {counts.slice(0, 5).map(({ option, count }) => (
          <button type="button" key={option} className={`stat tone-${statusTone(option)} ${status === option ? 'active' : ''}`} onClick={() => { setStatus(status === option ? 'All' : option); setPage(0) }}>
            <span>{option}</span><strong><Counter value={count} /></strong>
            <i style={{ width: `${(count / Math.max(1, records.length)) * 100}%` }} />
          </button>
        ))}
      </section>

      {extra}

      <section className="card table-card">
        <div className="table-tools">
          <label className="search">
            <Search size={16} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0) }} placeholder={`Search ${config.title.toLowerCase()}…`} aria-label={`Search ${config.title}`} />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={14} /></button>}
          </label>
          <div className="chips" role="tablist" aria-label="Filter by status">
            {statusOptions.map((option) => (
              <button type="button" role="tab" aria-selected={status === option} key={option} className={status === option ? 'chip active' : 'chip'} onClick={() => { setStatus(option); setPage(0) }}>{option}</button>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div className="bulk-bar" initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }}>
              <span><Check size={15} /> {selected.size} selected</span>
              <button type="button" className="btn ghost sm" onClick={() => exportRows(records.filter((record) => selected.has(record.id)), 'selected')}><Download size={14} /> Export</button>
              <button type="button" className="btn danger sm" onClick={() => deleteRecords([...selected])}><Trash size={14} /> Delete</button>
              <button type="button" className="link" onClick={() => setSelected(new Set())}>Clear</button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th className="check-col"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all visible rows" /></th>
                {config.columns.map((column) => (
                  <th key={column}>
                    <button type="button" onClick={() => toggleSort(column)} className={sort?.key === column ? 'sorted' : ''}>
                      {toLabel(column)} <ArrowUpDown size={12} style={{ transform: sort?.key === column && sort.dir === -1 ? 'scaleY(-1)' : undefined }} />
                    </button>
                  </th>
                ))}
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {visible.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    layout="position"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ duration: 0.35, delay: Math.min(index * 0.02, 0.2) }}
                    className={selected.has(record.id) ? 'selected' : ''}
                  >
                    <td className="check-col"><input type="checkbox" checked={selected.has(record.id)} onChange={() => toggleOne(record.id)} aria-label={`Select row ${index + 1}`} /></td>
                    {config.columns.map((column, columnIndex) => (
                      <td key={column}>{renderCell(resource, column, record, columnIndex === 0)}</td>
                    ))}
                    <td className="actions-col">
                      <div className="row-actions">
                        {resource === 'members' && (
                          <>
                            <button type="button" className="icon-btn" aria-label="View member" onClick={() => onOpenMember(record.id)}><Eye size={15} /></button>
                            <button type="button" className="icon-btn accent" aria-label="Renew membership" onClick={() => { renewMember(record.id); toast({ title: `${record.name} renewed`, description: 'Invoice generated & expiry extended', tone: 'ok' }) }}><RefreshCw size={15} /></button>
                            <a className="icon-btn" aria-label="WhatsApp member" href={`https://wa.me/${(record.phone ?? '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /></a>
                          </>
                        )}
                        {resource === 'gates' && <button type="button" className="icon-btn accent" aria-label="Remote open gate" onClick={() => setGateTarget(record)}><DoorOpen size={15} /></button>}
                        <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setEditing(record)}><Pencil size={15} /></button>
                        <button type="button" className="icon-btn danger" aria-label="Delete" onClick={() => deleteRecords([record.id])}><Trash size={15} /></button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {visible.length === 0 && (
            <div className="empty-state">
              <Search size={28} />
              <strong>No {config.title.toLowerCase()} match</strong>
              <p>Try a different search or clear the filters.</p>
              <button type="button" className="btn ghost sm" onClick={() => { setQuery(''); setStatus('All') }}>Reset filters</button>
            </div>
          )}
        </div>

        <footer className="table-foot">
          <span>Showing {filtered.length === 0 ? 0 : safePage * pageSize + 1}–{Math.min(filtered.length, (safePage + 1) * pageSize)} of {filtered.length}</span>
          <div className="pager">
            <button type="button" className="icon-btn" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
            <span>{safePage + 1} / {pages}</span>
            <button type="button" className="icon-btn" disabled={safePage >= pages - 1} onClick={() => setPage(safePage + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
          </div>
        </footer>
      </section>

      <RecordModal
        open={editing !== null}
        title={editing === 'new' ? `New ${config.singular.toLowerCase()}` : `Edit ${config.singular.toLowerCase()}`}
        fields={config.fields}
        initial={editing && editing !== 'new' ? editing : defaultsFor(resource, records)}
        onClose={() => setEditing(null)}
        onSave={saveRecord}
      />

      <GateDialog gate={gateTarget} onClose={() => setGateTarget(null)} onConfirm={openGate} />
    </div>
  )
}

const defaultsFor = (resource: ResourceKey, records: ResourceRecord[]): Record<string, string> => {
  const today = isoDate(new Date())
  if (resource === 'members') {
    const max = records.reduce((highest, record) => Math.max(highest, Number((record.memberCode ?? '').replace(/\D/g, '')) || 0), 122)
    return { memberCode: `GYM-${String(max + 1).padStart(6, '0')}`, status: 'Biometric Pending', joinedOn: today, plan: 'Elite Monthly' }
  }
  if (resource === 'payments') return { invoiceNo: `INV-${new Date().getFullYear()}-${String(records.length + 1).padStart(4, '0')}`, paidAt: today, status: 'Paid', method: 'UPI' }
  if (resource === 'attendance') return { date: today, checkIn: new Date().toTimeString().slice(0, 5), method: 'Manual', gate: 'Main Turnstile' }
  return {}
}

function renderCell(resource: ResourceKey, column: string, record: ResourceRecord, primary: boolean): ReactNode {
  const value = record[column] ?? ''
  if (column === 'status' || (resource === 'attendance' && column === 'method')) return <span className={`pill ${statusTone(value)}`}>{value || '—'}</span>
  if (column === 'name' || column === 'memberName') {
    return <span className="cell-person"><span className="avatar sm">{initials(value)}</span><strong>{value}</strong></span>
  }
  if (column === 'amount' || column === 'price') return <strong className="mono">{inr(Number(value))}</strong>
  if (column === 'expiry') {
    const days = daysUntil(value)
    const tone = days < 0 ? 'danger' : days <= 10 ? 'warn' : 'ok'
    return <span className="cell-expiry">{formatDate(value)}<small className={tone}>{days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`}</small></span>
  }
  if (['paidAt', 'lastSync', 'date', 'joinedOn'].includes(column)) return formatDate(value)
  if (column === 'quality') {
    const quality = Number(value)
    return <span className="meter"><i style={{ width: `${quality}%`, background: quality >= 90 ? 'var(--ok)' : quality >= 80 ? 'var(--volt)' : 'var(--warn)' }} /><b>{value}</b></span>
  }
  if (column === 'rating') return <span className="mono">★ {value}</span>
  if (column === 'duration') return `${value} days`
  if (column === 'checkOut' && !value) return <span className="pill info">Inside</span>
  if (primary) return <strong className="mono">{value}</strong>
  return value || '—'
}

function RecordModal({ open, title, fields, initial, onClose, onSave }: { open: boolean; title: string; fields: FieldConfig[]; initial: Record<string, string>; onClose: () => void; onSave: (values: Omit<ResourceRecord, 'id'>) => void }) {
  const [values, setValues] = useState<Record<string, string>>({})

  useEffect(() => {
    if (open) setValues(Object.fromEntries(fields.map((field) => [field.key, initial[field.key] ?? ''])))
    // Reseed only when the modal opens; `initial` is a fresh object every render.
  }, [open, fields])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]))
    onSave(trimmed as Omit<ResourceRecord, 'id'>)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="record-modal-title"
            initial={{ opacity: 0, y: 40, scale: 0.95, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-head">
              <h2 id="record-modal-title">{title}</h2>
              <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
            </header>
            <form className="form-grid" onSubmit={submit}>
              {fields.map((field, index) => (
                <motion.label key={field.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * index }}>
                  <span>{field.label}{field.required && <em>*</em>}</span>
                  {field.type === 'select' ? (
                    <select value={values[field.key] ?? ''} required={field.required} onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}>
                      <option value="" disabled>Select…</option>
                      {field.options?.map((option) => <option key={option}>{option}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type ?? 'text'}
                      value={values[field.key] ?? ''}
                      required={field.required}
                      pattern={field.pattern}
                      title={field.hint}
                      placeholder={field.placeholder}
                      step={field.type === 'number' ? 'any' : undefined}
                      min={field.type === 'number' ? 0 : undefined}
                      onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  )}
                  {field.hint && <small>{field.hint}</small>}
                </motion.label>
              ))}
              <div className="form-actions">
                <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn primary"><Check size={16} /> Save</button>
              </div>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function GateDialog({ gate, onClose, onConfirm }: { gate: ResourceRecord | null; onClose: () => void; onConfirm: (gate: ResourceRecord, reason: string) => void }) {
  const [reason, setReason] = useState('')
  useEffect(() => setReason(''), [gate])
  return (
    <AnimatePresence>
      {gate && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section className="modal sm" role="dialog" aria-modal="true" aria-labelledby="gate-title" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onMouseDown={(event) => event.stopPropagation()}>
            <div className="gate-visual"><DoorOpen size={34} /></div>
            <h2 id="gate-title">Remote open · {gate.name}</h2>
            <p className="page-sub">Manual overrides are permission-guarded and permanently recorded in the audit log.</p>
            <form onSubmit={(event) => { event.preventDefault(); onConfirm(gate, reason.trim()) }} className="form-grid single">
              <label><span>Reason<em>*</em></span><input value={reason} onChange={(event) => setReason(event.target.value)} required minLength={4} placeholder="e.g. Member forgot finger injury, verified ID" autoFocus /></label>
              <div className="form-actions">
                <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn primary"><DoorOpen size={16} /> Open gate</button>
              </div>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
