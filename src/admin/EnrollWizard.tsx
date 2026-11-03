import { AnimatePresence, motion } from 'motion/react'
import { Check, FingerprintPattern, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Scene3D } from '../components/three/Scene3D'
import { loadBiometricScene } from '../components/three/loaders'
import type { ScanState } from '../components/three/BiometricScene'
import { useToast } from '../components/ui/Toast'
import { isoDate } from '../lib/format'
import { useAdminStore } from '../lib/store'

const fingers = ['Right Thumb', 'Left Thumb', 'Right Index', 'Left Index']
const requiredScans = 3

export default function EnrollWizard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, create, update, log } = useAdminStore()
  const toast = useToast()
  const [step, setStep] = useState<'select' | 'capture' | 'done'>('select')
  const [memberId, setMemberId] = useState('')
  const [finger, setFinger] = useState(fingers[0]!)
  const [device, setDevice] = useState('')
  const [scans, setScans] = useState<number[]>([])
  const [scanState, setScanState] = useState<ScanState>('idle')

  const candidates = useMemo(
    () => [...data.members].sort((a, b) => Number(b.status === 'Biometric Pending') - Number(a.status === 'Biometric Pending')),
    [data.members],
  )
  const biometricDevices = data.devices.filter((item) => item.type === 'Biometric')
  const member = data.members.find((item) => item.id === memberId)

  useEffect(() => {
    if (!open) return
    setStep('select')
    setMemberId(candidates[0]?.id ?? '')
    setDevice(biometricDevices[0]?.name ?? 'Main Entrance Fingerprint')
    setScans([])
    setScanState('idle')
    // Reset only when the wizard opens.
  }, [open])

  const capture = () => {
    if (scanState === 'scanning') return
    setScanState('scanning')
    window.setTimeout(() => {
      const quality = Math.round(72 + Math.random() * 27)
      if (quality < 80) {
        setScanState('denied')
        toast({ title: `Low quality (${quality})`, description: 'Ask the member to press flatter and retry.', tone: 'danger' })
      } else {
        setScanState('granted')
        setScans((current) => {
          const next = [...current, quality]
          if (next.length >= requiredScans) window.setTimeout(() => setStep('done'), 700)
          return next
        })
      }
      window.setTimeout(() => setScanState('idle'), 900)
    }, 1300)
  }

  const finish = () => {
    if (!member) return
    const quality = Math.round(scans.reduce((sum, value) => sum + value, 0) / Math.max(1, scans.length))
    create('biometrics', { memberName: member.name ?? '', finger, device, quality: String(quality), status: 'Active', lastSync: isoDate(new Date()) })
    if (member.status === 'Biometric Pending') update('members', { ...member, status: 'Active' })
    log('ENROLL', 'biometrics', `Enrolled ${finger} for ${member.name} on ${device} (quality ${quality})`)
    toast({ title: 'Fingerprint enrolled', description: `${member.name} can now use biometric entry.`, tone: 'ok' })
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section className="modal enroll" role="dialog" aria-modal="true" aria-labelledby="enroll-title" initial={{ opacity: 0, scale: 0.94, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} onMouseDown={(event) => event.stopPropagation()}>
            <header className="modal-head">
              <div><p className="kicker">Biometric enrolment</p><h2 id="enroll-title">Enroll fingerprint</h2></div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
            </header>
            <ol className="stepper">
              {['Select', 'Capture', 'Confirm'].map((label, index) => {
                const current = ['select', 'capture', 'done'].indexOf(step)
                return <li key={label} className={index < current ? 'done' : index === current ? 'active' : ''}><span>{index < current ? <Check size={12} /> : index + 1}</span>{label}</li>
              })}
            </ol>

            <div className="enroll-body">
              <div className={`enroll-visual state-${scanState}`}>
                <Scene3D load={loadBiometricScene} props={{ state: scanState }} fallback={<div className="fp-fallback" />} />
              </div>
              <AnimatePresence mode="wait">
                {step === 'select' && (
                  <motion.form key="select" className="form-grid single" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={(event) => { event.preventDefault(); setStep('capture') }}>
                    <label><span>Member<em>*</em></span>
                      <select value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
                        {candidates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.memberCode}{item.status === 'Biometric Pending' ? ' (pending)' : ''}</option>)}
                      </select>
                    </label>
                    <div className="field" role="group" aria-label="Finger"><span>Finger<em>*</em></span>
                      <div className="finger-grid">
                        {fingers.map((option) => <button type="button" key={option} aria-pressed={finger === option} className={finger === option ? 'chip active' : 'chip'} onClick={() => setFinger(option)}>{option}</button>)}
                      </div>
                    </div>
                    <label><span>Device<em>*</em></span>
                      <select value={device} onChange={(event) => setDevice(event.target.value)} required>
                        {biometricDevices.map((item) => <option key={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    <div className="form-actions"><button type="submit" className="btn primary" disabled={!memberId}>Continue</button></div>
                  </motion.form>
                )}
                {step === 'capture' && (
                  <motion.div key="capture" className="capture" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <p className="page-sub">Ask <strong>{member?.name}</strong> to place their <strong>{finger.toLowerCase()}</strong> on {device}. {requiredScans} good captures are required.</p>
                    <div className="scan-slots">
                      {Array.from({ length: requiredScans }).map((_, index) => (
                        <motion.div key={index} className={`scan-slot ${scans[index] ? 'ok' : ''}`} animate={scans[index] ? { scale: [1, 1.12, 1] } : {}}>
                          {scans[index] ? <><Check size={18} /><b>{scans[index]}</b></> : <FingerprintPattern size={20} />}
                        </motion.div>
                      ))}
                    </div>
                    <button type="button" className="btn primary block" onClick={capture} disabled={scanState === 'scanning' || scans.length >= requiredScans}>
                      {scanState === 'scanning' ? 'Capturing…' : `Capture scan ${Math.min(scans.length + 1, requiredScans)} of ${requiredScans}`}
                    </button>
                  </motion.div>
                )}
                {step === 'done' && (
                  <motion.div key="done" className="capture" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <div className="enroll-done"><Check size={30} /></div>
                    <h3>Template ready</h3>
                    <p className="page-sub">Average quality <strong>{Math.round(scans.reduce((sum, value) => sum + value, 0) / Math.max(1, scans.length))}</strong>. Only the device template ID is stored in the cloud.</p>
                    <button type="button" className="btn primary block" onClick={finish}>Save credential &amp; sync</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
