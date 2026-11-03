import { motion, useAnimationControls } from 'motion/react'
import { ArrowLeft, Eye, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { isDemoAvailable, login } from '../lib/api'
import type { SessionUser } from '../lib/types'
import { Scene3D } from '../components/three/Scene3D'
import { loadBiometricScene } from '../components/three/loaders'
import type { ScanState } from '../components/three/BiometricScene'
import './admin.css'

export default function AdminLogin({ onBack, onLogin }: { onBack: () => void; onLogin: (user: SessionUser) => void }) {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [error, setError] = useState('')
  const [scan, setScan] = useState<ScanState>('idle')
  const controls = useAnimationControls()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setScan('scanning')
    try {
      const user = await login(loginId, password)
      setScan('granted')
      window.setTimeout(() => onLogin(user), 650)
    } catch (loginError) {
      setScan('denied')
      setError(loginError instanceof Error ? loginError.message : 'Login failed.')
      void controls.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.45 } })
      window.setTimeout(() => setScan('idle'), 1800)
    }
  }

  const detectCaps = (event: KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState('CapsLock'))

  return (
    <main className="auth">
      <div className="auth-visual">
        <Scene3D load={loadBiometricScene} props={{ state: scan }} fallback={<div className="fp-fallback" />} />
        <div className="auth-visual-copy">
          <img src="/cult-logo.svg" alt="Cult Fitness" />
          <h2>Owner command center</h2>
          <p>Members, revenue, biometric access and hardware health — secured with role-based access and a full audit trail.</p>
          <ul>
            <li><ShieldCheck size={16} /> JWT sessions with refresh rotation</li>
            <li><ShieldCheck size={16} /> Idle auto-lock &amp; audit logging</li>
            <li><ShieldCheck size={16} /> Encrypted biometric template IDs</li>
          </ul>
        </div>
      </div>

      <section className="auth-panel">
        <button type="button" className="auth-back" onClick={onBack}><ArrowLeft size={16} /> Back to website</button>
        <motion.div className="auth-card" animate={controls} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <p className="kicker">Secure sign-in</p>
          <h1>Welcome back</h1>
          <p className="auth-sub">Sign in to manage Cult Fitness operations.</p>
          <form onSubmit={submit} className="auth-form">
            <label>
              Login ID
              <span className="auth-input"><Mail size={16} /><input value={loginId} onChange={(event) => setLoginId(event.target.value)} type="email" autoComplete="username" placeholder="owner@cultfitness.com" required autoFocus /></span>
            </label>
            <label>
              Password
              <span className="auth-input">
                <Lock size={16} />
                <input value={password} onChange={(event) => setPassword(event.target.value)} onKeyUp={detectCaps} onKeyDown={detectCaps} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" required minLength={6} />
                <button type="button" className="auth-eye" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((value) => !value)}><Eye size={16} /></button>
              </span>
            </label>
            {capsLock && <p className="auth-hint">Caps Lock is on</p>}
            <button type="submit" className="btn primary block" disabled={scan === 'scanning'}>
              {scan === 'scanning' ? <span className="btn-spinner" /> : null}
              {scan === 'scanning' ? 'Verifying…' : scan === 'granted' ? 'Access granted' : 'Sign in'}
            </button>
            {error && <p className="auth-error" role="alert">{error}</p>}
          </form>
          {isDemoAvailable() && <p className="auth-demo">Dev mode: when the API is offline, the credentials from <code>.env.local</code> unlock a local demo workspace.</p>}
        </motion.div>
      </section>
    </main>
  )
}
