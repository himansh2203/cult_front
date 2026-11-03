import { motion } from 'motion/react'
import { Download, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { downloadFile, formatDate, formatTime, isoDate, relativeTime } from '../lib/format'
import { useAdminStore } from '../lib/store'
import type { AuditEntry } from '../lib/types'

const actionTone: Record<AuditEntry['action'], string> = {
  CREATE: 'ok', UPDATE: 'info', DELETE: 'danger', LOGIN: 'info', LOGOUT: 'muted', GATE_OPEN: 'warn', ENROLL: 'ok', EXPORT: 'muted', IMPORT: 'info', RENEW: 'ok', RESET: 'danger',
}

export default function AuditPage() {
  const { data } = useAdminStore()
  const [query, setQuery] = useState('')
  const [action, setAction] = useState<'ALL' | AuditEntry['action']>('ALL')

  const actions = useMemo(() => Array.from(new Set(data.audit.map((entry) => entry.action))), [data.audit])
  const entries = useMemo(() => {
    const term = query.toLowerCase()
    return data.audit.filter((entry) => (action === 'ALL' || entry.action === action) && (!term || `${entry.summary} ${entry.actor} ${entry.entity}`.toLowerCase().includes(term)))
  }, [data.audit, query, action])

  const exportAudit = () => {
    const header = 'Timestamp,Actor,Action,Entity,Summary'
    const rows = entries.map((entry) => [entry.at, entry.actor, entry.action, entry.entity, entry.summary].map((value) => `"${value.replace(/"/g, '""').replace(/^([=+\-@])/, "'$1")}"`).join(','))
    downloadFile(`cult-audit-${isoDate(new Date())}.csv`, [header, ...rows].join('\n'))
  }

  return (
    <div className="resource">
      <header className="page-head">
        <div>
          <p className="kicker">Compliance</p>
          <h1>Audit log</h1>
          <p className="page-sub">Immutable trail of every create, update, delete, gate override, enrolment and export — who, what and when.</p>
        </div>
        <div className="page-actions"><button type="button" className="btn ghost" onClick={exportAudit}><Download size={16} /> Export</button></div>
      </header>

      <section className="card table-card">
        <div className="table-tools">
          <label className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audit trail…" aria-label="Search audit trail" /></label>
          <div className="chips">
            <button type="button" className={action === 'ALL' ? 'chip active' : 'chip'} onClick={() => setAction('ALL')}>All</button>
            {actions.map((item) => <button type="button" key={item} className={action === item ? 'chip active' : 'chip'} onClick={() => setAction(item)}>{item.replace('_', ' ')}</button>)}
          </div>
        </div>
        <ol className="audit-list">
          {entries.slice(0, 200).map((entry, index) => (
            <motion.li key={entry.id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * 0.02, 0.4) }}>
              <span className={`audit-dot ${actionTone[entry.action]}`} />
              <div className="audit-body">
                <p>{entry.summary}</p>
                <small><b>{entry.actor}</b> · {entry.entity} · {formatDate(entry.at)} {formatTime(entry.at)}</small>
              </div>
              <span className={`pill ${actionTone[entry.action]}`}>{entry.action.replace('_', ' ')}</span>
              <time>{relativeTime(entry.at)}</time>
            </motion.li>
          ))}
          {entries.length === 0 && <li className="empty">No audit entries match.</li>}
        </ol>
      </section>
    </div>
  )
}
