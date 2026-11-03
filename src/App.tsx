import { Suspense, lazy, useCallback, useEffect, useState } from 'react'
import { ToastProvider, useToast } from './components/ui/Toast'
import { logout, onSessionExpired, restoreSession } from './lib/api'
import { isAdminTab } from './lib/seed'
import type { AdminTab, SessionUser } from './lib/types'

const LandingPage = lazy(() => import('./landing/LandingPage'))
const AdminLogin = lazy(() => import('./admin/AdminLogin'))
const AdminApp = lazy(() => import('./admin/AdminApp'))

type Screen = 'landing' | 'admin'

const screenFromPath = (): Screen => (window.location.pathname.startsWith('/admin') ? 'admin' : 'landing')
const tabFromPath = (): AdminTab => {
  const segment = window.location.pathname.split('/')[2]
  return isAdminTab(segment) ? segment : 'dashboard'
}

function Router() {
  const toast = useToast()
  const [screen, setScreen] = useState<Screen>(screenFromPath)
  const [tab, setTab] = useState<AdminTab>(tabFromPath)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [checking, setChecking] = useState(screenFromPath() === 'admin')

  useEffect(() => {
    onSessionExpired(() => {
      setUser(null)
      toast({ title: 'Session expired', description: 'Please sign in again.', tone: 'info' })
    })
    return () => onSessionExpired(null)
  }, [toast])

  useEffect(() => {
    const sync = () => {
      setScreen(screenFromPath())
      setTab(tabFromPath())
    }
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  useEffect(() => {
    if (screen !== 'admin' || user) return
    let cancelled = false
    setChecking(true)
    restoreSession().then((restored) => {
      if (cancelled) return
      setUser(restored)
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [screen, user])

  useEffect(() => {
    document.title = screen === 'admin' ? 'Cult Fitness · Command Center' : 'Cult Fitness — Premium strength club with biometric access'
  }, [screen])

  const navigate = useCallback((next: Screen, nextTab: AdminTab = tab) => {
    window.history.pushState({}, '', next === 'admin' ? `/admin/${nextTab}` : '/')
    setScreen(next)
    setTab(nextTab)
    window.scrollTo({ top: 0 })
  }, [tab])

  const changeTab = useCallback((next: AdminTab) => {
    window.history.pushState({}, '', `/admin/${next}`)
    setTab(next)
  }, [])

  const signOut = useCallback(async (reason?: string) => {
    await logout()
    setUser(null)
    if (reason) toast({ title: reason, tone: 'info' })
  }, [toast])

  if (screen === 'landing') return <LandingPage onOpenAdmin={() => navigate('admin')} />
  if (checking) return <BootScreen />
  if (!user) return <AdminLogin onBack={() => navigate('landing')} onLogin={setUser} />
  return <AdminApp user={user} tab={tab} onTabChange={changeTab} onExit={() => navigate('landing')} onLogout={(reason) => void signOut(reason)} />
}

function BootScreen() {
  return (
    <div className="boot">
      <img src="/cult-logo.svg" alt="" />
      <span />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <Suspense fallback={<BootScreen />}>
        <Router />
      </Suspense>
    </ToastProvider>
  )
}
