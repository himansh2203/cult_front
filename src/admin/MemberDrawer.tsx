import { AnimatePresence, motion } from 'motion/react'
import { CalendarCheck, CreditCard, FingerprintPattern, Mail, MessageCircle, Phone, RefreshCw, X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { daysUntil, formatDate, initials, inr, statusTone } from '../lib/format'
import { planCatalog } from '../lib/seed'
import { useAdminStore } from '../lib/store'

export default function MemberDrawer({ memberId, onClose, onRenew }: { memberId: string | null; onClose: () => void; onRenew: (id: string) => void }) {
  const { data } = useAdminStore()
  const member = data.members.find((item) => item.id === memberId)

  useEffect(() => {
    if (!memberId) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [memberId, onClose])

  const details = useMemo(() => {
    if (!member) return null
    const payments = data.payments.filter((payment) => payment.memberName === member.name).slice(0, 6)
    const visits = data.attendance.filter((row) => row.memberCode === member.memberCode)
    const credentials = data.biometrics.filter((credential) => credential.memberName === member.name)
    const plan = planCatalog.find((item) => item.name === member.plan)
    const daysLeft = daysUntil(member.expiry)
    const runway = plan ? Math.max(0, Math.min(1, daysLeft / plan.days)) : 0
    const lifetime = data.payments.filter((payment) => payment.memberName === member.name && payment.status === 'Paid').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    return { payments, visits, credentials, plan, daysLeft, runway, lifetime }
  }, [data, member])

  return (
    <AnimatePresence>
      {member && details && (
        <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.aside
            className="drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${member.name} profile`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 34 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" className="icon-btn drawer-close" aria-label="Close profile" onClick={onClose}><X size={16} /></button>
            <div className="drawer-hero">
              <motion.span className="avatar xl" initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 16 }}>{initials(member.name ?? '')}</motion.span>
              <div>
                <h2>{member.name}</h2>
                <p className="mono">{member.memberCode}</p>
                <span className={`pill ${statusTone(member.status)}`}>{member.status}</span>
              </div>
            </div>

            <div className="drawer-contact">
              <a href={`tel:${member.phone}`}><Phone size={14} /> {member.phone}</a>
              {member.email && <a href={`mailto:${member.email}`}><Mail size={14} /> {member.email}</a>}
            </div>

            <section className="drawer-card runway">
              <div className="runway-head">
                <div><p className="kicker">{member.plan}</p><strong>{details.daysLeft < 0 ? `Expired ${Math.abs(details.daysLeft)} days ago` : `${details.daysLeft} days remaining`}</strong></div>
                <small>Expires {formatDate(member.expiry)}</small>
              </div>
              <div className="runway-track"><motion.i initial={{ width: 0 }} animate={{ width: `${details.runway * 100}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} className={details.daysLeft <= 10 ? 'warn' : ''} /></div>
              <div className="drawer-actions">
                <button type="button" className="btn primary sm" onClick={() => onRenew(member.id)}><RefreshCw size={14} /> Renew {details.plan ? `· ${inr(details.plan.price)}` : ''}</button>
                <a className="btn ghost sm" href={`https://wa.me/${(member.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${member.name}, this is Cult Fitness.`)}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>
              </div>
            </section>

            <div className="drawer-stats">
              <div><CalendarCheck size={16} /><strong>{details.visits.length}</strong><span>visits (14d)</span></div>
              <div><CreditCard size={16} /><strong>{inr(details.lifetime)}</strong><span>lifetime value</span></div>
              <div><FingerprintPattern size={16} /><strong>{details.credentials.length}</strong><span>credentials</span></div>
            </div>

            <section className="drawer-card">
              <p className="kicker">Profile</p>
              <dl className="drawer-dl">
                <dt>Trainer</dt><dd>{member.trainer || '—'}</dd>
                <dt>Joined</dt><dd>{formatDate(member.joinedOn)}</dd>
                <dt>Access window</dt><dd>{details.plan?.window ?? '—'}</dd>
              </dl>
            </section>

            <section className="drawer-card">
              <p className="kicker">Recent visits</p>
              <ul className="timeline">
                {details.visits.slice(0, 5).map((visit) => (
                  <li key={visit.id}><i /><div><strong>{formatDate(visit.date)} · {visit.checkIn}{visit.checkOut ? ` → ${visit.checkOut}` : ' (inside)'}</strong><small>{visit.method} · {visit.gate}</small></div></li>
                ))}
                {details.visits.length === 0 && <li className="empty">No visits in the last 14 days.</li>}
              </ul>
            </section>

            <section className="drawer-card">
              <p className="kicker">Payments</p>
              <ul className="mini-list">
                {details.payments.map((payment) => (
                  <li key={payment.id}><span className="mono">{payment.invoiceNo}</span><span>{formatDate(payment.paidAt)}</span><strong>{inr(Number(payment.amount))}</strong><span className={`pill ${statusTone(payment.status)}`}>{payment.status}</span></li>
                ))}
                {details.payments.length === 0 && <li className="empty">No payments recorded.</li>}
              </ul>
            </section>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
