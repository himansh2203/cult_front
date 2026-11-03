import { AnimatePresence, motion } from 'motion/react'
import { ArrowUpRight, Cpu, FingerprintPattern, MessageCircle, Pause, Play, RefreshCw, ScanLine, TrendingDown, TrendingUp, UserPlus } from 'lucide-react'
import { useMemo } from 'react'
import { AreaChart, Donut, Heatmap, Sparkline } from '../components/ui/Charts'
import { Counter, TiltCard } from '../components/ui/Effects'
import { Scene3D } from '../components/three/Scene3D'
import { loadClubTwin } from '../components/three/loaders'
import type { TwinZone } from '../components/three/ClubTwin'
import { addDays, compact, daysUntil, formatDate, formatTime, initials, inr, isoDate, statusTone } from '../lib/format'
import { useAdminStore } from '../lib/store'
import type { AdminTab, SessionUser } from '../lib/types'
import type { LiveFeed } from './useLiveFeed'

const monthLabel = new Intl.DateTimeFormat('en-IN', { month: 'short' })
const dayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })
const mixColors = ['#d7ff5f', '#5ff4ff', '#9b8cff', '#ff9f5f', '#5fffa8']

export default function Dashboard({ user, feed, onNavigate, onSimulate, onRenew, onOpenMember }: {
  user: SessionUser
  feed: LiveFeed
  onNavigate: (tab: AdminTab) => void
  onSimulate: () => void
  onRenew: (id: string) => void
  onOpenMember: (id: string) => void
}) {
  const { data } = useAdminStore()
  const today = isoDate(new Date())

  const metrics = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 11 + index, 1))
    const paid = data.payments.filter((payment) => payment.status === 'Paid')
    const revenueByMonth = months.map((month) => ({
      label: monthLabel.format(month),
      value: paid.filter((payment) => {
        const date = new Date(payment.paidAt ?? '')
        return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
      }).reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    }))
    const thisMonth = revenueByMonth.at(-1)?.value ?? 0
    const lastMonth = revenueByMonth.at(-2)?.value ?? 0

    const days = Array.from({ length: 7 }, (_, index) => isoDate(addDays(now, index - 6)))
    const checkinsByDay = days.map((day) => data.attendance.filter((row) => row.date === day).length)
    const todayCheckins = checkinsByDay.at(-1) ?? 0
    const yesterdayCheckins = checkinsByDay.at(-2) ?? 0

    const active = data.members.filter((member) => member.status === 'Active').length
    const expiring = data.members
      .filter((member) => member.status !== 'Suspended')
      .map((member) => ({ member, days: daysUntil(member.expiry) }))
      .filter(({ days }) => days >= 0 && days <= 10)
      .sort((a, b) => a.days - b.days)

    const hours = Array.from({ length: 18 }, (_, index) => index + 5)
    const heat = days.map((day) => hours.map((hour) => data.attendance.filter((row) => row.date === day && Number((row.checkIn ?? '').slice(0, 2)) === hour).length))

    const mix = Array.from(new Set(data.members.map((member) => member.plan ?? 'Other'))).map((plan, index) => ({
      label: plan,
      value: data.members.filter((member) => member.plan === plan && member.status !== 'Expired').length,
      color: mixColors[index % mixColors.length]!,
    }))

    const inside = data.attendance.filter((row) => row.date === today && !row.checkOut).length
    const devicesOnline = data.devices.filter((device) => device.status === 'Online').length

    return { revenueByMonth, thisMonth, lastMonth, checkinsByDay, todayCheckins, yesterdayCheckins, active, expiring, days, hours, heat, mix, inside, devicesOnline }
  }, [data, today])

  const zones: TwinZone[] = useMemo(() => {
    const inside = Math.max(metrics.inside, 6)
    const split = [0.34, 0.22, 0.18, 0.14, 0.12]
    return [
      { name: 'Strength', capacity: 60, position: [-2.2, -1.2], size: [3.2, 2.4] },
      { name: 'Cardio', capacity: 40, position: [1.8, -1.4], size: [2.6, 2] },
      { name: 'Functional', capacity: 30, position: [-2.4, 1.6], size: [2.8, 2] },
      { name: 'Studio', capacity: 25, position: [1.2, 1.2], size: [2, 1.8] },
      { name: 'Recovery', capacity: 15, position: [3.2, 1.4], size: [1.2, 1.6] },
    ].map((zone, index) => ({ ...zone, occupancy: Math.round(inside * split[index]!) })) as TwinZone[]
  }, [metrics.inside])

  const latest = feed.events[0]
  const pulse = latest ? { id: latest.id, result: latest.result } : null
  const revenueDelta = metrics.lastMonth ? ((metrics.thisMonth - metrics.lastMonth) / metrics.lastMonth) * 100 : 0
  const checkinDelta = metrics.yesterdayCheckins ? ((metrics.todayCheckins - metrics.yesterdayCheckins) / metrics.yesterdayCheckins) * 100 : 0
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const health = Math.round((metrics.devicesOnline / Math.max(1, data.devices.length)) * 100)

  const kpis = [
    { label: 'Revenue this month', value: metrics.thisMonth, format: (value: number) => inr(value), delta: revenueDelta, spark: metrics.revenueByMonth.map((point) => point.value), tab: 'payments' as AdminTab },
    { label: 'Active members', value: metrics.active, format: (value: number) => Math.round(value).toString(), delta: 0, spark: [], tab: 'members' as AdminTab, deltaLabel: `${Math.round((metrics.active / Math.max(1, data.members.length)) * 100)}% of base` },
    { label: "Today's check-ins", value: metrics.todayCheckins, format: (value: number) => Math.round(value).toString(), delta: checkinDelta, spark: metrics.checkinsByDay, tab: 'attendance' as AdminTab },
    { label: 'Renewals due (10d)', value: metrics.expiring.length, format: (value: number) => Math.round(value).toString(), delta: 0, spark: [], tab: 'members' as AdminTab, deltaLabel: inr(metrics.expiring.reduce((sum, { member }) => sum + (Number(data.memberships.find((plan) => plan.planName === member.plan)?.price) || 0), 0)) + ' at stake' },
  ]

  return (
    <div className="dash">
      <section className="dash-hero">
        <div className="dash-hero-copy">
          <p className="kicker">{new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
          <h1>{greeting}, {user.name.split(' ')[0]}.</h1>
          <p><strong><Counter value={metrics.inside} /></strong> members on the floor · <strong>{metrics.expiring.length}</strong> renewals to chase · <strong>{data.devices.length - metrics.devicesOnline}</strong> devices need attention</p>
          <div className="dash-hero-actions">
            <button type="button" className="btn primary" onClick={onSimulate}><ScanLine size={16} /> Simulate scan</button>
            <button type="button" className="btn ghost" onClick={() => onNavigate('members')}><UserPlus size={16} /> Add member</button>
            <button type="button" className="btn ghost" onClick={() => onNavigate('biometrics')}><FingerprintPattern size={16} /> Enroll</button>
          </div>
        </div>
        <div className="dash-ring" style={{ ['--pct' as string]: `${health}%` }}>
          <div>
            <strong><Counter value={health} />%</strong>
            <span>System health</span>
            <small>{metrics.devicesOnline}/{data.devices.length} devices online</small>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        {kpis.map((kpi, index) => (
          <motion.button
            type="button"
            key={kpi.label}
            className="kpi"
            onClick={() => onNavigate(kpi.tab)}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * index, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4 }}
          >
            <span className="kpi-label">{kpi.label}<ArrowUpRight size={14} /></span>
            <strong><Counter value={kpi.value} format={kpi.format} /></strong>
            <div className="kpi-foot">
              {kpi.deltaLabel ? (
                <span className="delta neutral">{kpi.deltaLabel}</span>
              ) : (
                <span className={`delta ${kpi.delta >= 0 ? 'up' : 'down'}`}>{kpi.delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{Math.abs(kpi.delta).toFixed(1)}%</span>
              )}
              {kpi.spark.length > 1 && <Sparkline values={kpi.spark} color={index % 2 ? 'var(--cyan)' : 'var(--volt)'} />}
            </div>
          </motion.button>
        ))}
      </section>

      <section className="dash-grid">
        <article className="card span-2">
          <header className="card-head">
            <div><p className="kicker">Revenue</p><h2>12-month collections</h2></div>
            <span className="chip">{inr(metrics.revenueByMonth.reduce((sum, point) => sum + point.value, 0))} total</span>
          </header>
          <AreaChart data={metrics.revenueByMonth} format={(value) => inr(value)} />
        </article>

        <article className="card live-card">
          <header className="card-head">
            <div><p className="kicker">Realtime</p><h2>Access stream</h2></div>
            <div className="card-actions">
              <span className={`live-dot ${feed.paused ? 'paused' : ''}`} />
              <button type="button" className="icon-btn" aria-label={feed.paused ? 'Resume feed' : 'Pause feed'} onClick={() => feed.setPaused(!feed.paused)}>{feed.paused ? <Play size={15} /> : <Pause size={15} />}</button>
            </div>
          </header>
          <ul className="feed">
            <AnimatePresence initial={false}>
              {feed.events.slice(0, 7).map((event) => (
                <motion.li
                  layout
                  key={event.id}
                  className={`feed-row ${event.result === 'GRANTED' ? 'ok' : 'danger'}`}
                  initial={{ opacity: 0, x: -30, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                >
                  <span className="avatar sm">{event.member === 'Unidentified' ? '?' : initials(event.member)}</span>
                  <div><strong>{event.member}</strong><small>{event.reason} · {event.gate}</small></div>
                  <div className="feed-meta"><b>{event.result === 'GRANTED' ? 'Granted' : 'Denied'}</b><small>{formatTime(event.at)}</small></div>
                </motion.li>
              ))}
            </AnimatePresence>
            {feed.events.length === 0 && <li className="empty">Waiting for the first scan… <button type="button" className="link" onClick={onSimulate}>Simulate one</button></li>}
          </ul>
        </article>

        <article className="card twin-card span-2">
          <header className="card-head">
            <div><p className="kicker">Digital twin · 3D</p><h2>Live floor occupancy</h2></div>
            <span className="chip"><Counter value={metrics.inside} /> inside now</span>
          </header>
          <div className="twin-stage">
            <Scene3D load={loadClubTwin} props={{ zones, pulse }} fallback={<div className="twin-fallback">{zones.map((zone) => <div key={zone.name}><span>{zone.name}</span><b>{zone.occupancy}/{zone.capacity}</b></div>)}</div>} />
          </div>
          <p className="twin-hint">Drag to orbit · scroll to zoom · gate flashes on every scan</p>
        </article>

        <article className="card">
          <header className="card-head"><div><p className="kicker">Plan mix</p><h2>Active memberships</h2></div></header>
          <Donut segments={metrics.mix} label={String(metrics.mix.reduce((sum, item) => sum + item.value, 0))} sublabel="current members" />
        </article>

        <article className="card span-2">
          <header className="card-head">
            <div><p className="kicker">Footfall heatmap</p><h2>When the floor gets busy</h2></div>
            <span className="chip">Last 7 days</span>
          </header>
          <Heatmap rows={metrics.days.map((day) => dayLabel.format(new Date(day)))} columns={metrics.hours.map((value) => String(value).padStart(2, '0'))} values={metrics.heat} />
        </article>

        <article className="card">
          <header className="card-head">
            <div><p className="kicker">Retention</p><h2>Renewals due</h2></div>
            <button type="button" className="link" onClick={() => onNavigate('members')}>View all</button>
          </header>
          <ul className="list">
            {metrics.expiring.slice(0, 6).map(({ member, days }) => (
              <li key={member.id}>
                <button type="button" className="list-main" onClick={() => onOpenMember(member.id)}>
                  <span className="avatar sm">{initials(member.name ?? '')}</span>
                  <div><strong>{member.name}</strong><small>{member.plan} · {days === 0 ? 'expires today' : `in ${days}d`} ({formatDate(member.expiry)})</small></div>
                </button>
                <div className="list-actions">
                  <a className="icon-btn" aria-label={`WhatsApp ${member.name}`} href={`https://wa.me/${(member.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${member.name}, your ${member.plan} membership at Cult Fitness expires on ${formatDate(member.expiry)}. Renew now to keep your streak going!`)}`} target="_blank" rel="noreferrer"><MessageCircle size={15} /></a>
                  <button type="button" className="icon-btn accent" aria-label={`Renew ${member.name}`} onClick={() => onRenew(member.id)}><RefreshCw size={15} /></button>
                </div>
              </li>
            ))}
            {metrics.expiring.length === 0 && <li className="empty">No renewals due in the next 10 days.</li>}
          </ul>
        </article>

        <article className="card span-3 devices-strip">
          {data.devices.map((device) => (
            <TiltCard key={device.id} className={`device-tile tone-${statusTone(device.status)}`} intensity={8}>
              <Cpu size={18} />
              <strong>{device.name}</strong>
              <small>{device.type} · {device.ipAddress || '—'}</small>
              <span className={`pill ${statusTone(device.status)}`}>{device.status}</span>
            </TiltCard>
          ))}
          <div className="device-tile summary">
            <strong>{compact(data.attendance.length)}</strong>
            <small>events synced from edge in the last 14 days</small>
          </div>
        </article>
      </section>
    </div>
  )
}
