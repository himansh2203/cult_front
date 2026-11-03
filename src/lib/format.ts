import type { ResourceRecord } from './types'

const inrFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const compactFormatter = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 })
const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

export const inr = (value: number) => inrFormatter.format(Number.isFinite(value) ? value : 0)
export const compact = (value: number) => compactFormatter.format(value)

export const formatDate = (iso: string | undefined) => {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : dateFormatter.format(date)
}

export const formatTime = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? iso : timeFormatter.format(date)
}

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(diff)) return iso
  const seconds = Math.round(diff / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export const daysUntil = (iso: string | undefined) => {
  if (!iso) return Number.POSITIVE_INFINITY
  const target = new Date(iso)
  if (Number.isNaN(target.getTime())) return Number.POSITIVE_INFINITY
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}

export const isoDate = (date: Date) => date.toISOString().slice(0, 10)

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((part) => /^\p{L}/u.test(part))
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

export const toLabel = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())

export const statusTone = (status: string | undefined): 'ok' | 'warn' | 'danger' | 'info' | 'muted' => {
  const value = (status ?? '').toLowerCase()
  if (['active', 'paid', 'online', 'enabled', 'granted', 'synced', 'present'].some((token) => value.includes(token))) return 'ok'
  if (['pending', 'syncing', 'trial', 'review', 'maintenance', 'leave'].some((token) => value.includes(token))) return 'warn'
  if (['expired', 'denied', 'failed', 'offline', 'suspended', 'revoked', 'error', 'refunded', 'disabled'].some((token) => value.includes(token))) return 'danger'
  if (value) return 'info'
  return 'muted'
}

// Prevents spreadsheet formula injection when the CSV is opened in Excel/Sheets.
const escapeCsv = (value: string) => {
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded
}

export const toCsv = (rows: ResourceRecord[], columns: string[]) => {
  const header = columns.map((column) => escapeCsv(toLabel(column))).join(',')
  const body = rows.map((row) => columns.map((column) => escapeCsv(row[column] ?? '')).join(','))
  return [header, ...body].join('\n')
}

export const downloadFile = (filename: string, content: string, mime = 'text/csv;charset=utf-8') => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const seededRandom = (seed: number) => {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const uid = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`
