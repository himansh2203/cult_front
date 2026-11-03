import { useCallback, useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getAccessToken, refreshAccessToken, socketUrl, type AccessDecisionPayload } from '../lib/api'
import { isoDate, uid } from '../lib/format'
import { useAdminStore } from '../lib/store'
import type { AccessEvent, ResourceRecord } from '../lib/types'

const humanize = (reason: string) => (reason === 'AUTHORIZED' ? 'Access verified' : reason.replace(/_/g, ' ').toLowerCase().replace(/^./, (letter) => letter.toUpperCase()))

const denialFor = (member: ResourceRecord): string | null => {
  const status = (member.status ?? '').toLowerCase()
  if (status === 'expired') return 'Membership expired'
  if (status === 'suspended') return 'Member suspended'
  if (status.includes('pending')) return 'Fingerprint not enrolled'
  if (member.expiry && new Date(member.expiry) < new Date(isoDate(new Date()))) return 'Membership expired'
  return null
}

export function useLiveFeed() {
  const { data, append, mode } = useAdminStore()
  const [events, setEvents] = useState<AccessEvent[]>([])
  const [paused, setPaused] = useState(false)
  const [connected, setConnected] = useState(false)
  const snapshot = useRef(data)
  const seen = useRef(new Map<string, AccessEvent>())
  const pausedRef = useRef(paused)

  useEffect(() => {
    snapshot.current = data
  }, [data])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  const ingest = useCallback((decision: AccessDecisionPayload) => {
    const known = seen.current.get(decision.eventId)
    if (known) return known
    const at = new Date(decision.occurredAt)
    const event: AccessEvent = {
      id: decision.eventId,
      at: at.toISOString(),
      member: decision.memberName ?? 'Unidentified',
      memberCode: decision.memberCode ?? '—',
      gate: decision.gateName ?? 'Main gate',
      result: decision.result === 'ALLOWED' ? 'GRANTED' : 'DENIED',
      reason: humanize(decision.reason),
      confidence: decision.memberCode ? 98 : 0,
    }
    seen.current.set(decision.eventId, event)
    if (seen.current.size > 200) seen.current.delete(seen.current.keys().next().value!)
    if (!pausedRef.current) setEvents((current) => [event, ...current].slice(0, 40))
    if (event.result === 'GRANTED' && decision.memberCode) {
      append('attendance', {
        id: `live-${decision.eventId}`,
        memberName: event.member,
        memberCode: event.memberCode,
        date: isoDate(at),
        checkIn: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`,
        checkOut: '',
        method: 'Fingerprint',
        gate: event.gate,
      })
    }
    return event
  }, [append])

  useEffect(() => {
    if (mode !== 'api') return
    const socket = io(socketUrl, { auth: (callback) => callback({ token: getAccessToken() }), transports: ['websocket', 'polling'] })
    let retrying = false
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', async () => {
      setConnected(false)
      if (retrying) return
      retrying = true
      // Handshake usually fails because the 15-minute access token expired; rotate and retry once.
      if (await refreshAccessToken()) socket.connect()
      window.setTimeout(() => { retrying = false }, 10_000)
    })
    socket.on('access:decision', (decision: AccessDecisionPayload) => ingest(decision))
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [mode, ingest])

  const emit = useCallback((override?: { result: AccessEvent['result']; reason: string }) => {
    const { members, gates } = snapshot.current
    if (members.length === 0) return null
    const now = new Date()
    const unknown = !override && Math.random() < 0.06
    const member = members[Math.floor(Math.random() * members.length)]!
    const gate = gates.find((item) => item.mode !== 'Locked' && item.status === 'Online')?.name ?? 'Main Turnstile'
    const denial = unknown ? 'Unknown fingerprint' : denialFor(member)
    const event: AccessEvent = {
      id: uid('evt'),
      at: now.toISOString(),
      member: unknown ? 'Unidentified' : member.name ?? 'Member',
      memberCode: unknown ? '—' : member.memberCode ?? '',
      gate,
      result: override?.result ?? (denial ? 'DENIED' : 'GRANTED'),
      reason: override?.reason ?? denial ?? `${member.plan ?? 'Plan'} valid`,
      confidence: unknown ? 0 : Math.round(94 + Math.random() * 5.9),
    }
    setEvents((current) => [event, ...current].slice(0, 40))
    if (event.result === 'GRANTED' && !unknown) {
      append('attendance', {
        id: uid('att'),
        memberName: event.member,
        memberCode: event.memberCode,
        date: isoDate(now),
        checkIn: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
        checkOut: '',
        method: 'Fingerprint',
        gate,
      })
    }
    return event
  }, [append])

  useEffect(() => {
    if (paused || mode !== 'demo') return
    let timer = 0
    const loop = () => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') emit()
        loop()
      }, 3800 + Math.random() * 4200)
    }
    loop()
    return () => window.clearTimeout(timer)
  }, [paused, emit, mode])

  return { events, emit, ingest, paused, setPaused, connected, live: mode === 'api' }
}

export type LiveFeed = ReturnType<typeof useLiveFeed>
