import { useCallback, useEffect, useRef, useState } from 'react'
import { isoDate, uid } from '../lib/format'
import { useAdminStore } from '../lib/store'
import type { AccessEvent, ResourceRecord } from '../lib/types'

const denialFor = (member: ResourceRecord): string | null => {
  const status = (member.status ?? '').toLowerCase()
  if (status === 'expired') return 'Membership expired'
  if (status === 'suspended') return 'Member suspended'
  if (status.includes('pending')) return 'Fingerprint not enrolled'
  if (member.expiry && new Date(member.expiry) < new Date(isoDate(new Date()))) return 'Membership expired'
  return null
}

export function useLiveFeed() {
  const { data, append } = useAdminStore()
  const [events, setEvents] = useState<AccessEvent[]>([])
  const [paused, setPaused] = useState(false)
  const snapshot = useRef(data)

  useEffect(() => {
    snapshot.current = data
  }, [data])

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
    if (paused) return
    let timer = 0
    const loop = () => {
      timer = window.setTimeout(() => {
        if (document.visibilityState === 'visible') emit()
        loop()
      }, 3800 + Math.random() * 4200)
    }
    loop()
    return () => window.clearTimeout(timer)
  }, [paused, emit])

  return { events, emit, paused, setPaused }
}

export type LiveFeed = ReturnType<typeof useLiveFeed>
