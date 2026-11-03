import { motion, useInView } from 'motion/react'
import { useId, useMemo, useRef, useState } from 'react'

type Point = { label: string; value: number }

const buildPath = (points: Array<[number, number]>) => {
  if (points.length === 0) return ''
  // Catmull-Rom → cubic Bézier for a smooth curve through every point.
  let path = `M ${points[0]![0]} ${points[0]![1]}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i]!
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p3 = points[i + 2] ?? p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`
  }
  return path
}

export function AreaChart({ data, height = 240, format = (value) => String(value), color = 'var(--volt)' }: { data: Point[]; height?: number; format?: (value: number) => string; color?: string }) {
  const id = useId().replace(/:/g, '')
  const [hover, setHover] = useState<number | null>(null)
  const width = 640
  const pad = { top: 20, right: 12, bottom: 28, left: 12 }
  const max = Math.max(1, ...data.map((point) => point.value)) * 1.15
  const step = (width - pad.left - pad.right) / Math.max(1, data.length - 1)
  const coords = data.map((point, index): [number, number] => [pad.left + index * step, pad.top + (1 - point.value / max) * (height - pad.top - pad.bottom)])
  const line = buildPath(coords)
  const area = coords.length ? `${line} L ${coords.at(-1)![0]} ${height - pad.bottom} L ${coords[0]![0]} ${height - pad.bottom} Z` : ''
  const active = hover !== null ? coords[hover] : undefined

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="area-chart" role="img" aria-label="Trend chart" onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`fill-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
          <filter id={`glow-${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line key={ratio} x1={pad.left} x2={width - pad.right} y1={pad.top + ratio * (height - pad.top - pad.bottom)} y2={pad.top + ratio * (height - pad.top - pad.bottom)} className="chart-grid" />
        ))}
        <motion.path d={area} fill={`url(#fill-${id})`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay: 0.4 }} />
        <motion.path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" filter={`url(#glow-${id})`} initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }} />
        {data.map((point, index) => (
          <g key={point.label}>
            <rect x={coords[index]![0] - step / 2} y={0} width={step} height={height} fill="transparent" onPointerEnter={() => setHover(index)} />
            <text x={coords[index]![0]} y={height - 6} className="chart-label" textAnchor="middle">{point.label}</text>
          </g>
        ))}
        {active && (
          <g pointerEvents="none">
            <line x1={active[0]} x2={active[0]} y1={pad.top} y2={height - pad.bottom} className="chart-cursor" />
            <circle cx={active[0]} cy={active[1]} r="7" fill={color} className="chart-dot" />
          </g>
        )}
      </svg>
      {hover !== null && active && (
        <div className="chart-tooltip" style={{ left: `${(active[0] / width) * 100}%`, top: `${(active[1] / height) * 100}%` }}>
          <span>{data[hover]!.label}</span>
          <strong>{format(data[hover]!.value)}</strong>
        </div>
      )}
    </div>
  )
}

export function Sparkline({ values, color = 'var(--volt)' }: { values: number[]; color?: string }) {
  const width = 120
  const height = 36
  const max = Math.max(1, ...values)
  const min = Math.min(...values, 0)
  const coords = values.map((value, index): [number, number] => [(index / Math.max(1, values.length - 1)) * width, height - 4 - ((value - min) / Math.max(1, max - min)) * (height - 8)])
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="sparkline" aria-hidden="true">
      <motion.path d={buildPath(coords)} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
    </svg>
  )
}

export function Donut({ segments, label, sublabel }: { segments: Array<{ label: string; value: number; color: string }>; label: string; sublabel: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1
  const radius = 70
  const circumference = 2 * Math.PI * radius
  const arcs = useMemo(() => {
    let offset = 0
    return segments.map((segment) => {
      const length = (segment.value / total) * circumference
      const arc = { ...segment, length, offset }
      offset += length
      return arc
    })
  }, [segments, total, circumference])

  return (
    <div className="donut">
      <div className="donut-chart">
      <svg viewBox="0 0 180 180" role="img" aria-label={`${label} ${sublabel}`}>
        <circle cx="90" cy="90" r={radius} className="donut-track" />
        {arcs.map((arc, index) => (
          <motion.circle
            key={arc.label}
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth="18"
            strokeLinecap="butt"
            strokeDashoffset={-arc.offset}
            transform="rotate(-90 90 90)"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            whileInView={{ strokeDasharray: `${Math.max(0, arc.length - 3)} ${circumference}` }}
            viewport={{ once: true }}
            transition={{ duration: 1.1, delay: 0.15 * index, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </svg>
      <div className="donut-center"><strong>{label}</strong><span>{sublabel}</span></div>
      </div>
      <ul className="donut-legend">
        {segments.map((segment) => (
          <li key={segment.label}><i style={{ background: segment.color }} /><span>{segment.label}</span><b>{Math.round((segment.value / total) * 100)}%</b></li>
        ))}
      </ul>
    </div>
  )
}

export function Heatmap({ rows, columns, values }: { rows: string[]; columns: string[]; values: number[][] }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true })
  const max = Math.max(1, ...values.flat())
  return (
    <div className="heatmap" ref={ref} style={{ gridTemplateColumns: `48px repeat(${columns.length}, minmax(0, 1fr))` }}>
      <span />
      {columns.map((column) => <span key={column} className="heatmap-col">{column}</span>)}
      {rows.map((row, rowIndex) => (
        <div className="heatmap-row" key={row} style={{ display: 'contents' }}>
          <span className="heatmap-rowlabel">{row}</span>
          {columns.map((column, columnIndex) => {
            const value = values[rowIndex]?.[columnIndex] ?? 0
            const intensity = value / max
            return (
              <motion.span
                key={column}
                className="heatmap-cell"
                title={`${row} ${column}:00 — ${value} check-ins`}
                style={{ background: `color-mix(in oklab, var(--heat, var(--volt)) ${Math.round(intensity * 100)}%, var(--cell-empty))`, boxShadow: intensity > 0.75 ? '0 0 14px rgba(215,255,95,0.45)' : 'none' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : undefined}
                transition={{ delay: (rowIndex + columnIndex) * 0.015, type: 'spring', stiffness: 300, damping: 20 }}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function BarList({ items, format = (value) => String(value) }: { items: Array<{ label: string; value: number }>; format?: (value: number) => string }) {
  const ref = useRef<HTMLUListElement>(null)
  const inView = useInView(ref, { once: true })
  const max = Math.max(1, ...items.map((item) => item.value))
  return (
    <ul className="bar-list" ref={ref}>
      {items.map((item, index) => (
        <li key={item.label}>
          <div><span>{item.label}</span><strong>{format(item.value)}</strong></div>
          <span className="bar-track">
            <motion.span className="bar-fill" initial={{ width: 0 }} animate={inView ? { width: `${(item.value / max) * 100}%` } : undefined} transition={{ duration: 1, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }} />
          </span>
        </li>
      ))}
    </ul>
  )
}
