import { AnimatePresence, motion } from 'motion/react'
import { Check, TriangleAlert, X, Zap } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

type Tone = 'ok' | 'danger' | 'info'
type ToastInput = { title: string; description?: string; tone?: Tone; action?: { label: string; onClick: () => void } }
type ToastItem = ToastInput & { id: number }

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null)

const icons = { ok: Check, danger: TriangleAlert, info: Zap }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])

  const push = useCallback((toast: ToastInput) => {
    counter.current += 1
    const id = counter.current
    setToasts((current) => [...current.slice(-3), { ...toast, id }])
    window.setTimeout(() => dismiss(id), toast.action ? 6500 : 4200)
  }, [dismiss])

  const value = useMemo(() => push, [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = icons[toast.tone ?? 'info']
            return (
              <motion.div
                layout
                key={toast.id}
                className={`toast toast-${toast.tone ?? 'info'}`}
                initial={{ opacity: 0, y: 24, scale: 0.92, rotateX: -30 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              >
                <span className="toast-icon"><Icon size={16} /></span>
                <div>
                  <strong>{toast.title}</strong>
                  {toast.description && <p>{toast.description}</p>}
                </div>
                {toast.action && (
                  <button type="button" className="toast-action" onClick={() => { toast.action?.onClick(); dismiss(toast.id) }}>
                    {toast.action.label}
                  </button>
                )}
                <button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}><X size={14} /></button>
                <motion.span className="toast-timer" initial={{ scaleX: 1 }} animate={{ scaleX: 0 }} transition={{ duration: toast.action ? 6.5 : 4.2, ease: 'linear' }} />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const toast = useContext(ToastContext)
  if (!toast) throw new Error('useToast must be used within ToastProvider')
  return toast
}
