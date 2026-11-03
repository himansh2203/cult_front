import { motion } from 'motion/react'
import { Download, FileSpreadsheet, Printer } from 'lucide-react'
import { useMemo } from 'react'
import { AreaChart, BarList, Donut } from '../components/ui/Charts'
import { Counter, TiltCard } from '../components/ui/Effects'
import { useToast } from '../components/ui/Toast'
import { downloadFile, inr, isoDate, toCsv } from '../lib/format'
import { resourceConfigs } from '../lib/seed'
import { useAdminStore } from '../lib/store'
import type { ResourceKey } from '../lib/types'

const weekday = new Intl.DateTimeFormat('en-IN', { weekday: 'short' })
const month = new Intl.DateTimeFormat('en-IN', { month: 'short' })

export default function ReportsPage() {
  const { data, log } = useAdminStore()
  const toast = useToast()

  const report = useMemo(() => {
    const paid = data.payments.filter((payment) => payment.status === 'Paid')
    const revenue = paid.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const pending = data.payments.filter((payment) => payment.status === 'Pending').reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const byMethod = Array.from(new Set(paid.map((payment) => payment.method ?? ''))).map((method) => ({ label: method.replace('_', ' '), value: paid.filter((payment) => payment.method === method).reduce((sum, payment) => sum + Number(payment.amount || 0), 0) })).sort((a, b) => b.value - a.value)
    const byPlan = data.memberships.map((plan) => ({ label: plan.planName ?? '', value: data.members.filter((member) => member.plan === plan.planName).length })).sort((a, b) => b.value - a.value)
    const byWeekday = Array.from({ length: 7 }, (_, index) => {
      const label = weekday.format(new Date(2024, 0, 7 + index))
      return { label, value: data.attendance.filter((row) => new Date(row.date ?? '').getDay() === index).length }
    })
    const now = new Date()
    const memberTrend = Array.from({ length: 12 }, (_, index) => {
      const pointer = new Date(now.getFullYear(), now.getMonth() - 11 + index + 1, 0)
      return { label: month.format(pointer), value: data.members.filter((member) => new Date(member.joinedOn ?? '') <= pointer).length }
    })
    const active = data.members.filter((member) => member.status === 'Active').length
    const retention = (active / Math.max(1, data.members.length)) * 100
    const arpu = revenue / Math.max(1, new Set(paid.map((payment) => payment.memberName)).size)
    const denied = data.biometrics.filter((credential) => credential.status !== 'Active').length
    return { revenue, pending, byMethod, byPlan, byWeekday, memberTrend, retention, arpu, denied }
  }, [data])

  const exportResource = (resource: ResourceKey) => {
    const rows = data[resource]
    downloadFile(`cult-${resource}-${isoDate(new Date())}.csv`, toCsv(rows, resourceConfigs[resource].fields.map((field) => field.key)))
    log('EXPORT', resource, `Exported ${rows.length} ${resource} from reports`)
    toast({ title: `${resourceConfigs[resource].title} exported`, description: `${rows.length} rows`, tone: 'ok' })
  }

  const kpis = [
    { label: 'Collected revenue', value: report.revenue, format: (value: number) => inr(value) },
    { label: 'Pending collections', value: report.pending, format: (value: number) => inr(value) },
    { label: 'Active retention', value: report.retention, format: (value: number) => `${value.toFixed(1)}%` },
    { label: 'Avg. revenue / member', value: report.arpu, format: (value: number) => inr(value) },
  ]

  return (
    <div className="resource reports">
      <header className="page-head">
        <div>
          <p className="kicker">Analytics</p>
          <h1>Reports</h1>
          <p className="page-sub">Board-ready insights across revenue, retention, footfall and access — exportable in one click.</p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn ghost" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
          <button type="button" className="btn primary" onClick={() => exportResource('payments')}><Download size={16} /> Revenue CSV</button>
        </div>
      </header>

      <section className="kpi-grid">
        {kpis.map((kpi, index) => (
          <motion.div key={kpi.label} className="kpi static" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}>
            <span className="kpi-label">{kpi.label}</span>
            <strong><Counter value={kpi.value} format={kpi.format} /></strong>
          </motion.div>
        ))}
      </section>

      <section className="dash-grid">
        <article className="card span-2">
          <header className="card-head"><div><p className="kicker">Growth</p><h2>Member base over 12 months</h2></div></header>
          <AreaChart data={report.memberTrend} color="var(--cyan)" />
        </article>
        <article className="card">
          <header className="card-head"><div><p className="kicker">Plan mix</p><h2>Members by plan</h2></div></header>
          <Donut segments={report.byPlan.map((item, index) => ({ ...item, color: ['#d7ff5f', '#5ff4ff', '#9b8cff', '#ff9f5f'][index % 4]! }))} label={String(data.members.length)} sublabel="total members" />
        </article>
        <article className="card">
          <header className="card-head"><div><p className="kicker">Revenue</p><h2>By payment rail</h2></div></header>
          <BarList items={report.byMethod} format={(value) => inr(value)} />
        </article>
        <article className="card">
          <header className="card-head"><div><p className="kicker">Footfall</p><h2>Visits by weekday</h2></div></header>
          <BarList items={report.byWeekday} />
        </article>
        <article className="card">
          <header className="card-head"><div><p className="kicker">Access</p><h2>Credential health</h2></div></header>
          <div className="health-stack">
            <div><strong>{data.biometrics.length - report.denied}</strong><span>active credentials</span></div>
            <div className="warn"><strong>{report.denied}</strong><span>revoked / pending sync</span></div>
            <div><strong>{data.members.filter((member) => member.status === 'Biometric Pending').length}</strong><span>members awaiting enrolment</span></div>
          </div>
        </article>
      </section>

      <section>
        <header className="card-head"><div><p className="kicker">Data exports</p><h2>Download datasets</h2></div></header>
        <div className="export-grid">
          {(Object.keys(resourceConfigs) as ResourceKey[]).map((resource) => (
            <TiltCard key={resource} className="export-card" intensity={8}>
              <FileSpreadsheet size={22} />
              <strong>{resourceConfigs[resource].title}</strong>
              <span>{data[resource].length} rows</span>
              <button type="button" className="btn ghost sm" onClick={() => exportResource(resource)}><Download size={14} /> CSV</button>
            </TiltCard>
          ))}
        </div>
      </section>
    </div>
  )
}
