import { animate, motion, useInView, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { Fragment, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode, type PointerEvent as ReactPointerEvent } from 'react'

export function Reveal({ children, delay = 0, y = 32, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'section' | 'article' | 'li' }) {
  const reduce = useReducedMotion()
  const Component = motion[as] as typeof motion.div
  return (
    <Component
      className={className}
      initial={reduce ? false : { opacity: 0, y, filter: 'blur(8px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </Component>
  )
}

export function SplitHeading({ text, className, as = 'h2', delay = 0 }: { text: string; className?: string; as?: 'h1' | 'h2'; delay?: number }) {
  const reduce = useReducedMotion()
  // Observe the heading itself: each word starts clipped by its overflow-hidden mask, so it can never intersect on its own.
  const ref = useRef<HTMLHeadingElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const Tag = as as ElementType
  const words = text.split(' ')
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          <span className="split-word" aria-hidden="true">
            <motion.span
              initial={reduce ? false : { y: '110%', rotateX: -70, opacity: 0 }}
              animate={inView || reduce ? { y: '0%', rotateX: 0, opacity: 1 } : undefined}
              transition={{ duration: 0.9, delay: delay + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
            >
              {word}
            </motion.span>
          </span>
          {index < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </Tag>
  )
}

export function TiltCard({ children, className, intensity = 12, style }: { children: ReactNode; className?: string; intensity?: number; style?: CSSProperties }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0.5)
  const y = useMotionValue(0.5)
  const springX = useSpring(x, { stiffness: 220, damping: 22 })
  const springY = useSpring(y, { stiffness: 220, damping: 22 })
  const rotateY = useTransform(springX, [0, 1], [-intensity, intensity])
  const rotateX = useTransform(springY, [0, 1], [intensity, -intensity])
  const glareX = useTransform(springX, (value) => `${value * 100}%`)
  const glareY = useTransform(springY, (value) => `${value * 100}%`)
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.22), transparent 55%)`

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (reduce) return
    const rect = event.currentTarget.getBoundingClientRect()
    x.set((event.clientX - rect.left) / rect.width)
    y.set((event.clientY - rect.top) / rect.height)
  }
  const onLeave = () => {
    x.set(0.5)
    y.set(0.5)
  }

  return (
    <motion.div className={`tilt-card ${className ?? ''}`} style={{ ...style, rotateX, rotateY, transformPerspective: 900 }} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
      <motion.span className="tilt-glare" style={{ background: glare }} aria-hidden="true" />
    </motion.div>
  )
}

export function Magnetic({ children, strength = 0.35 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const x = useSpring(0, { stiffness: 260, damping: 18 })
  const y = useSpring(0, { stiffness: 260, damping: 18 })
  const reduce = useReducedMotion()

  const onMove = (event: ReactPointerEvent<HTMLSpanElement>) => {
    if (reduce || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set((event.clientX - rect.left - rect.width / 2) * strength)
    y.set((event.clientY - rect.top - rect.height / 2) * strength)
  }

  return (
    <motion.span ref={ref} className="magnetic" style={{ x, y }} onPointerMove={onMove} onPointerLeave={() => { x.set(0); y.set(0) }}>
      {children}
    </motion.span>
  )
}

export function Counter({ value, format = (n) => Math.round(n).toLocaleString('en-IN'), duration = 1.4 }: { value: number; format?: (value: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const previous = useRef(0)
  const formatRef = useRef(format)
  formatRef.current = format
  const [display, setDisplay] = useState(() => format(0))

  useEffect(() => {
    if (!inView) return
    if (reduce) {
      setDisplay(formatRef.current(value))
      return
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => {
        previous.current = latest
        setDisplay(formatRef.current(latest))
      },
    })
    return () => controls.stop()
  }, [inView, value, duration, reduce])

  return <span ref={ref} className="counter">{display}</span>
}

export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect()
      node.style.setProperty('--mx', `${event.clientX - rect.left}px`)
      node.style.setProperty('--my', `${event.clientY - rect.top}px`)
    }
    node.addEventListener('pointermove', onMove)
    return () => node.removeEventListener('pointermove', onMove)
  }, [])
  return ref
}
