import { AnimatePresence, motion } from 'motion/react'
import { Bell, ChevronLeft, Command as CommandIcon, Globe, LogOut, Menu, Moon, Plus, ScanLine, Search, Sun, TriangleAlert, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../components/ui/Toast'
import { simulateFingerprint } from '../lib/api'
import { daysUntil, initials } from '../lib/format'
import { adminTabs, navGroups, resourceConfigs } from '../lib/seed'
import { AdminStoreProvider, useAdminStore } from '../lib/store'
import type { AdminTab, ResourceKey, SessionUser } from '../lib/types'
import AuditPage from './AuditPage'
import { CommandPalette, type Command } from './CommandPalette'
import Dashboard from './Dashboard'
import EnrollWizard from './EnrollWizard'
import MemberDrawer from './MemberDrawer'
import ReportsPage from './ReportsPage'
import ResourcePage from './ResourcePage'
import WorkspaceTools from './WorkspaceTools'
import { tabIcons } from './icons'
import { useLiveFeed } from './useLiveFeed'
import './admin.css'

type ShellProps = { user: SessionUser; tab: AdminTab; onTabChange: (tab: AdminTab) => void; onExit: () => void; onLogout: (reason?: string) => void }

export default function AdminApp(props: ShellProps) {
  return (
    <AdminStoreProvider actor={props.user.email}>
      <AdminShell {...props} />
    </AdminStoreProvider>
  )
}

const themeKey = 'cult-admin-theme'

function AdminShell({ user, tab, onTabChange, onExit, onLogout }: ShellProps) {
  const { data, renewMember, log } = useAdminStore()
  const toast = useToast()
  const feed = useLiveFeed()
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem(themeKey) === 'light' ? 'light' : 'dark'))
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [memberId, setMemberId] = useState<string | null>(null)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [createSignal, setCreateSignal] = useState(0)
  const loggedIn = useRef(false)

  useEffect(() => {
    localStorage.setItem(themeKey, theme)
  }, [theme])

  useEffect(() => {
    if (loggedIn.current) return
    loggedIn.current = true
    log('LOGIN', 'session', `${user.email} signed in (${user.mode === 'api' ? 'API session' : 'local demo'})`)
  }, [log, user])

  const idleMinutes = Number(data.settings.find((setting) => setting.key === 'idleLockMinutes' && setting.status === 'Enabled')?.value) || 0
  useEffect(() => {
    if (!idleMinutes) return
    let timer = window.setTimeout(() => onLogout('Session locked after inactivity'), idleMinutes * 60_000)
    const reset = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => onLogout('Session locked after inactivity'), idleMinutes * 60_000)
    }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart']
    events.forEach((name) => window.addEventListener(name, reset, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      events.forEach((name) => window.removeEventListener(name, reset))
    }
  }, [idleMinutes, onLogout])

  const goTo = useCallback((next: AdminTab) => {
    onTabChange(next)
    setMobileNav(false)
  }, [onTabChange])

  const startCreate = useCallback((resource: ResourceKey) => {
    goTo(resource)
    setCreateSignal((value) => value + 1)
  }, [goTo])

  const simulate = useCallback(async () => {
    if (user.mode === 'api') {
      try {
        const decision = await simulateFingerprint()
        const event = feed.emit({ result: decision.result === 'ALLOWED' ? 'GRANTED' : 'DENIED', reason: `API: ${decision.reason.replace(/_/g, ' ').toLowerCase()}` })
        if (event) toast({ title: `Access ${event.result.toLowerCase()}`, description: `${event.member} · ${event.reason}`, tone: event.result === 'GRANTED' ? 'ok' : 'danger' })
        return
      } catch {
        toast({ title: 'Edge API unreachable', description: 'Falling back to local simulation', tone: 'danger' })
      }
    }
    const event = feed.emit()
    if (event) toast({ title: `Access ${event.result.toLowerCase()}`, description: `${event.member} · ${event.reason}`, tone: event.result === 'GRANTED' ? 'ok' : 'danger' })
  }, [feed, toast, user.mode])

  const renew = useCallback((id: string) => {
    const member = data.members.find((item) => item.id === id)
    renewMember(id)
    toast({ title: `${member?.name ?? 'Member'} renewed`, description: 'Invoice generated · expiry extended', tone: 'ok' })
  }, [data.members, renewMember, toast])

  const alerts = useMemo(() => {
    const list: Array<{ id: string; title: string; detail: string; tab: AdminTab }> = []
    data.devices.filter((device) => device.status === 'Offline').forEach((device) => list.push({ id: device.id, title: `${device.name} offline`, detail: 'No heartbeat — check power & network', tab: 'devices' }))
    const expiring = data.members.filter((member) => { const days = daysUntil(member.expiry); return days >= 0 && days <= 7 })
    if (expiring.length) list.push({ id: 'expiring', title: `${expiring.length} memberships expire this week`, detail: 'Send renewal reminders', tab: 'members' })
    const pending = data.payments.filter((payment) => payment.status === 'Pending')
    if (pending.length) list.push({ id: 'pending', title: `${pending.length} payments pending`, detail: 'Reconcile collections', tab: 'payments' })
    const bio = data.members.filter((member) => member.status === 'Biometric Pending')
    if (bio.length) list.push({ id: 'bio', title: `${bio.length} members awaiting enrolment`, detail: 'Fingerprint not captured yet', tab: 'biometrics' })
    return list
  }, [data])

  const commands: Command[] = useMemo(() => [
    ...adminTabs.map((item) => {
      const Icon = tabIcons[item.id]
      return { id: `nav-${item.id}`, label: item.label, group: 'Navigate', icon: <Icon size={16} />, run: () => goTo(item.id) }
    }),
    { id: 'new-member', label: 'Create member', group: 'Actions', icon: <UserPlus size={16} />, hint: 'N', run: () => startCreate('members') },
    { id: 'new-payment', label: 'Record payment', group: 'Actions', icon: <Plus size={16} />, run: () => startCreate('payments') },
    { id: 'enroll', label: 'Enroll fingerprint', group: 'Actions', icon: <ScanLine size={16} />, run: () => setEnrollOpen(true) },
    { id: 'simulate', label: 'Simulate gate scan', group: 'Actions', icon: <ScanLine size={16} />, run: () => void simulate() },
    { id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, group: 'Preferences', icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />, run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
    { id: 'site', label: 'Open public website', group: 'Preferences', icon: <Globe size={16} />, run: onExit },
    { id: 'logout', label: 'Log out', group: 'Preferences', icon: <LogOut size={16} />, run: () => onLogout() },
    ...data.members.map((member) => ({ id: `member-${member.id}`, label: `${member.name} · ${member.memberCode}`, group: 'Members', keywords: `${member.phone} ${member.status}`, icon: <span className="avatar xs">{initials(member.name ?? '')}</span>, hint: member.status, run: () => setMemberId(member.id) })),
  ], [data.members, goTo, onExit, onLogout, simulate, startCreate, theme])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen((open) => !open)
      } else if (!typing && event.key === '/') {
        event.preventDefault()
        setPaletteOpen(true)
      } else if (!typing && event.key.toLowerCase() === 'n' && !event.metaKey && !event.ctrlKey && tab in resourceConfigs) {
        setCreateSignal((value) => value + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab])

  const current = adminTabs.find((item) => item.id === tab)

  const page = (() => {
    if (tab === 'dashboard') return <Dashboard user={user} feed={feed} onNavigate={goTo} onSimulate={() => void simulate()} onRenew={renew} onOpenMember={setMemberId} />
    if (tab === 'reports') return <ReportsPage />
    if (tab === 'audit') return <AuditPage />
    return <ResourcePage resource={tab} createSignal={createSignal} onOpenMember={setMemberId} onEnroll={() => setEnrollOpen(true)} extra={tab === 'settings' ? <WorkspaceTools /> : undefined} />
  })()

  return (
    <div className={`admin theme-${theme} ${collapsed ? 'is-collapsed' : ''} ${mobileNav ? 'nav-open' : ''}`}>
      <div className="admin-bg" aria-hidden="true" />
      <aside className="sidebar" aria-label="Admin navigation">
        <div className="sidebar-top">
          <button type="button" className="sidebar-brand" onClick={onExit} aria-label="Open public website"><img src="/cult-logo.svg" alt="" /></button>
          <button type="button" className="icon-btn collapse-btn" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((value) => !value)}><ChevronLeft size={16} /></button>
        </div>
        <nav>
          {navGroups.map((group) => (
            <div key={group.label} className="nav-group">
              <p>{group.label}</p>
              {group.items.map((item) => {
                const Icon = tabIcons[item.id]
                const active = tab === item.id
                const badge = item.id === 'members' ? data.members.filter((member) => member.status === 'Biometric Pending').length : item.id === 'devices' ? data.devices.filter((device) => device.status === 'Offline').length : 0
                return (
                  <button type="button" key={item.id} className={active ? 'active' : ''} onClick={() => goTo(item.id)} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined}>
                    {active && <motion.span layoutId="nav-active" className="nav-active" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <Icon size={18} />
                    <span className="nav-label">{item.label}</span>
                    {badge > 0 && <b className="nav-badge">{badge}</b>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="avatar">{initials(user.name)}</span>
          <div className="nav-label"><strong>{user.name}</strong><small>{user.roles.join(', ')} · {user.mode === 'api' ? 'Secure API' : 'Demo'}</small></div>
          <button type="button" className="icon-btn" aria-label="Log out" onClick={() => onLogout()}><LogOut size={16} /></button>
        </div>
      </aside>
      <button type="button" className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNav(false)} />

      <div className="workspace">
        <header className="topbar">
          <button type="button" className="icon-btn mobile-only" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={18} /></button>
          <div className="crumbs"><span>Cult Fitness</span><b>/</b><strong>{current?.label}</strong></div>
          <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search size={16} /> <span>Search or jump to…</span> <kbd><CommandIcon size={11} />K</kbd>
          </button>
          <div className="topbar-actions">
            <button type="button" className="btn primary sm scan-btn" onClick={() => void simulate()}><ScanLine size={15} /> <span>Scan</span></button>
            <div className="notif-wrap">
              <button type="button" className="icon-btn" aria-label={`Notifications (${alerts.length})`} aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((open) => !open)}>
                <Bell size={17} />
                {alerts.length > 0 && <motion.b className="notif-count" initial={{ scale: 0 }} animate={{ scale: 1 }}>{alerts.length}</motion.b>}
              </button>
              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div className="notif-panel" initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}>
                    <p className="kicker">Needs attention</p>
                    {alerts.map((alert) => (
                      <button type="button" key={alert.id} onClick={() => { goTo(alert.tab); setNotificationsOpen(false) }}>
                        <TriangleAlert size={16} />
                        <div><strong>{alert.title}</strong><small>{alert.detail}</small></div>
                      </button>
                    ))}
                    {alerts.length === 0 && <p className="empty">All clear. Nothing needs attention.</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <button type="button" className="icon-btn" aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} style={{ display: 'grid' }}>
                  {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </header>

        <main className="page">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} exit={{ opacity: 0, y: -12, filter: 'blur(4px)' }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
              {page}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <MemberDrawer memberId={memberId} onClose={() => setMemberId(null)} onRenew={renew} />
      <EnrollWizard open={enrollOpen} onClose={() => setEnrollOpen(false)} />
    </div>
  )
}
