import { Database, Download, RotateCcw, Upload } from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { useToast } from '../components/ui/Toast'
import { downloadFile, isoDate } from '../lib/format'
import { isAdminData, useAdminStore } from '../lib/store'

const maxBackupBytes = 5 * 1024 * 1024

export default function WorkspaceTools() {
  const { data, replaceAll, reset, log } = useAdminStore()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const backup = () => {
    downloadFile(`cult-backup-${isoDate(new Date())}.json`, JSON.stringify(data, null, 2), 'application/json')
    log('EXPORT', 'workspace', 'Downloaded full workspace backup')
    toast({ title: 'Backup downloaded', tone: 'ok' })
  }

  const restoreFrom = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > maxBackupBytes) {
      toast({ title: 'Backup too large', description: 'Maximum size is 5 MB.', tone: 'danger' })
      return
    }
    try {
      const parsed: unknown = JSON.parse(await file.text())
      if (!isAdminData(parsed)) throw new Error('File is not a Cult workspace backup.')
      replaceAll(parsed)
      toast({ title: 'Workspace restored', description: file.name, tone: 'ok' })
    } catch (error) {
      toast({ title: 'Restore failed', description: error instanceof Error ? error.message : 'Invalid file', tone: 'danger' })
    }
  }

  const doReset = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      window.setTimeout(() => setConfirmReset(false), 4000)
      return
    }
    reset()
    setConfirmReset(false)
    toast({ title: 'Demo data restored', tone: 'info' })
  }

  return (
    <section className="tools-grid">
      <article className="card tool">
        <Database size={20} />
        <strong>Workspace backup</strong>
        <p>Download every member, payment, credential and audit entry as a single JSON file.</p>
        <button type="button" className="btn ghost sm" onClick={backup}><Download size={14} /> Download backup</button>
      </article>
      <article className="card tool">
        <Upload size={20} />
        <strong>Restore from backup</strong>
        <p>Validated before import. Current workspace is replaced and the action is audited.</p>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={restoreFrom} />
        <button type="button" className="btn ghost sm" onClick={() => fileInput.current?.click()}><Upload size={14} /> Choose file</button>
      </article>
      <article className="card tool danger-zone">
        <RotateCcw size={20} />
        <strong>Reset demo data</strong>
        <p>Regenerates the sample workspace. Use before a fresh sales demo.</p>
        <button type="button" className="btn danger sm" onClick={doReset}><RotateCcw size={14} /> {confirmReset ? 'Click again to confirm' : 'Reset workspace'}</button>
      </article>
    </section>
  )
}
