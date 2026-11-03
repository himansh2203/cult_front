import { Component, Suspense, lazy, useMemo, type ComponentType, type ReactNode } from 'react'
import { useReducedMotion } from 'motion/react'

const hasWebGL = () => {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** Renders a lazily-loaded WebGL scene only when the device can handle it; otherwise a static fallback. */
export function Scene3D<P extends object>({ load, props, fallback, className }: { load: () => Promise<{ default: ComponentType<P> }>; props: P; fallback: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  const LazyScene = useMemo(() => lazy(load), [load])
  const supported = useMemo(hasWebGL, [])

  return (
    <div className={`scene-3d ${className ?? ''}`}>
      {supported && !reduce ? (
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={<div className="scene-loading"><span /></div>}>
            <LazyScene {...props} />
          </Suspense>
        </SceneBoundary>
      ) : (
        fallback
      )}
    </div>
  )
}
