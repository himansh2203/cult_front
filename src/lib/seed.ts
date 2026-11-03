import { addDays, isoDate, seededRandom } from './format'
import type { AdminData, AdminTab, ResourceConfig, ResourceKey, ResourceRecord } from './types'

export const planCatalog = [
  { name: 'Student Flex', days: 30, price: 1499, window: '06:00 - 16:00', perks: 'Off-peak access, app workouts' },
  { name: 'Elite Monthly', days: 30, price: 2499, window: '05:00 - 23:00', perks: 'Unlimited access, biometric entry, trainer check-in' },
  { name: 'Transformation 90', days: 90, price: 6999, window: '05:00 - 23:00', perks: 'Progress reviews, nutrition guidance, InBody scans' },
  { name: 'Annual Black', days: 365, price: 21999, window: '24x7 priority', perks: 'Priority access, guest passes, recovery lounge' },
]

const memberStatuses = ['Active', 'Biometric Pending', 'Expired', 'Suspended', 'Trial']
const paymentMethods = ['UPI', 'CARD', 'CASH', 'BANK_TRANSFER', 'ONLINE']
const roles = ['OWNER', 'MANAGER', 'RECEPTIONIST', 'TRAINER', 'ACCOUNTANT']
const fingers = ['Right Thumb', 'Left Thumb', 'Right Index', 'Left Index']
const gates = ['Main Turnstile', 'Studio Door', 'Recovery Lounge']

export const resourceConfigs: Record<ResourceKey, ResourceConfig> = {
  members: {
    title: 'Members',
    singular: 'Member',
    kicker: 'Member lifecycle',
    description: 'Every athlete, their plan, biometric state and renewal runway in one place.',
    columns: ['memberCode', 'name', 'phone', 'plan', 'status', 'expiry'],
    statusKey: 'status',
    searchKeys: ['memberCode', 'name', 'phone', 'email', 'plan', 'status'],
    fields: [
      { key: 'memberCode', label: 'Member ID', placeholder: 'GYM-000150', required: true, pattern: '^GYM-\\d{6}$', hint: 'Format GYM-000000' },
      { key: 'name', label: 'Full name', placeholder: 'Member name', required: true },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 43210', required: true, pattern: '^\\+?[0-9 ]{10,15}$' },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'member@example.com' },
      { key: 'plan', label: 'Membership', type: 'select', options: planCatalog.map((plan) => plan.name), source: 'plans', required: true },
      { key: 'trainer', label: 'Assigned trainer', placeholder: 'Coach Arjun', source: 'trainers' },
      { key: 'status', label: 'Status', type: 'select', options: memberStatuses, required: true },
      { key: 'joinedOn', label: 'Joined on', type: 'date', required: true },
      { key: 'expiry', label: 'Expiry', type: 'date', required: true },
    ],
  },
  memberships: {
    title: 'Memberships',
    singular: 'Plan',
    kicker: 'Plan catalogue',
    description: 'Design sellable plans with access windows, pricing and perks.',
    columns: ['planName', 'duration', 'price', 'accessWindow', 'status'],
    statusKey: 'status',
    searchKeys: ['planName', 'perks', 'status'],
    fields: [
      { key: 'planName', label: 'Plan name', placeholder: 'Elite Monthly', required: true },
      { key: 'duration', label: 'Duration (days)', type: 'number', placeholder: '30', required: true },
      { key: 'price', label: 'Price (INR)', type: 'number', placeholder: '2499', required: true },
      { key: 'accessWindow', label: 'Access window', placeholder: '05:00 - 23:00', required: true },
      { key: 'perks', label: 'Perks', placeholder: 'Unlimited access, trainer check-in' },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Paused', 'Archived'], required: true },
    ],
  },
  payments: {
    title: 'Payments',
    singular: 'Payment',
    kicker: 'Revenue & invoices',
    description: 'Collections, invoices and reconciliation across every payment rail.',
    columns: ['invoiceNo', 'memberName', 'amount', 'method', 'status', 'paidAt'],
    statusKey: 'status',
    searchKeys: ['invoiceNo', 'memberName', 'method', 'status'],
    fields: [
      { key: 'invoiceNo', label: 'Invoice no.', placeholder: 'INV-2026-0001', required: true },
      { key: 'memberName', label: 'Member', placeholder: 'Start typing a name', source: 'members', required: true },
      { key: 'amount', label: 'Amount (INR)', type: 'number', placeholder: '2499', required: true },
      { key: 'method', label: 'Method', type: 'select', options: paymentMethods, required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Paid', 'Pending', 'Failed', 'Refunded'], required: true },
      { key: 'paidAt', label: 'Date', type: 'date', required: true },
    ],
  },
  attendance: {
    title: 'Attendance',
    singular: 'Check-in',
    kicker: 'Footfall',
    description: 'Every entry captured by fingerprint, QR or front desk — with session length.',
    columns: ['memberName', 'memberCode', 'date', 'checkIn', 'checkOut', 'method', 'gate'],
    statusKey: 'method',
    searchKeys: ['memberName', 'memberCode', 'method', 'gate', 'date'],
    fields: [
      { key: 'memberName', label: 'Member', placeholder: 'Rahul Kumar' },
      { key: 'memberCode', label: 'Member ID', placeholder: 'GYM-000123', source: 'memberCodes', required: true },
      { key: 'date', label: 'Date', type: 'date', required: true },
      { key: 'checkIn', label: 'Check-in', type: 'time', required: true },
      { key: 'checkOut', label: 'Check-out', type: 'time' },
      { key: 'method', label: 'Method', type: 'select', options: ['Fingerprint', 'QR', 'Manual'], required: true },
      { key: 'gate', label: 'Gate', type: 'select', options: gates, source: 'gates', required: true },
    ],
  },
  biometrics: {
    title: 'Biometrics',
    singular: 'Credential',
    kicker: 'Fingerprint credentials',
    description: 'Template enrolment, quality scores and device sync state. Raw templates never leave the device.',
    columns: ['memberName', 'finger', 'device', 'quality', 'status', 'lastSync'],
    statusKey: 'status',
    searchKeys: ['memberName', 'finger', 'device', 'status'],
    fields: [
      { key: 'memberName', label: 'Member', placeholder: 'Start typing a name', source: 'members', required: true },
      { key: 'finger', label: 'Finger', type: 'select', options: fingers, required: true },
      { key: 'device', label: 'Device', type: 'select', options: ['Main Entrance Fingerprint'], source: 'devices', required: true },
      { key: 'quality', label: 'Quality score', type: 'number', placeholder: '92', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Sync Pending', 'Revoked'], required: true },
      { key: 'lastSync', label: 'Last sync', type: 'date', required: true },
    ],
  },
  devices: {
    title: 'Devices',
    singular: 'Device',
    kicker: 'Edge hardware',
    description: 'Fingerprint readers, edge agents and controllers with heartbeat telemetry.',
    columns: ['name', 'type', 'ipAddress', 'firmware', 'status', 'lastSync'],
    statusKey: 'status',
    searchKeys: ['name', 'type', 'ipAddress', 'status'],
    fields: [
      { key: 'name', label: 'Device name', placeholder: 'Main Entrance Fingerprint', required: true },
      { key: 'type', label: 'Type', type: 'select', options: ['Biometric', 'Edge Agent', 'Gate Controller', 'Camera'], required: true },
      { key: 'ipAddress', label: 'IP address', placeholder: '192.168.1.40', pattern: '^(\\d{1,3}\\.){3}\\d{1,3}$' },
      { key: 'firmware', label: 'Firmware', placeholder: 'v6.2.1' },
      { key: 'branch', label: 'Branch', placeholder: 'Main Branch', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Online', 'Syncing', 'Offline', 'Maintenance'], required: true },
      { key: 'lastSync', label: 'Last sync', type: 'date', required: true },
    ],
  },
  gates: {
    title: 'Gates',
    singular: 'Gate',
    kicker: 'Access points',
    description: 'Turnstiles and doors with mode control and audited remote override.',
    columns: ['name', 'controller', 'mode', 'status', 'lastEvent'],
    statusKey: 'status',
    searchKeys: ['name', 'controller', 'mode', 'status'],
    fields: [
      { key: 'name', label: 'Gate name', placeholder: 'Main Turnstile', required: true },
      { key: 'controller', label: 'Controller', placeholder: 'Turnstile Relay', required: true },
      { key: 'branch', label: 'Branch', placeholder: 'Main Branch', required: true },
      { key: 'mode', label: 'Mode', type: 'select', options: ['Normal', 'Locked', 'Free Pass'], required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Online', 'Offline', 'Maintenance'], required: true },
      { key: 'lastEvent', label: 'Last event', placeholder: '20:42:18' },
    ],
  },
  trainers: {
    title: 'Trainers',
    singular: 'Trainer',
    kicker: 'Coaching team',
    description: 'Coaches, specialities, client load and member satisfaction.',
    columns: ['name', 'specialty', 'clients', 'rating', 'status'],
    statusKey: 'status',
    searchKeys: ['name', 'specialty', 'status'],
    fields: [
      { key: 'name', label: 'Name', placeholder: 'Coach Arjun', required: true },
      { key: 'phone', label: 'Phone', type: 'tel', placeholder: '+91 98765 40000' },
      { key: 'specialty', label: 'Specialty', placeholder: 'Strength & powerlifting', required: true },
      { key: 'clients', label: 'Active clients', type: 'number', placeholder: '18', required: true },
      { key: 'rating', label: 'Rating', type: 'number', placeholder: '4.8', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave'], required: true },
    ],
  },
  staff: {
    title: 'Staff',
    singular: 'Staff member',
    kicker: 'Team & roles',
    description: 'Role-based access for owners, managers, front desk, trainers and accounts.',
    columns: ['name', 'email', 'role', 'shift', 'status'],
    statusKey: 'status',
    searchKeys: ['name', 'email', 'role', 'status'],
    fields: [
      { key: 'name', label: 'Name', placeholder: 'Reception User', required: true },
      { key: 'email', label: 'Email', type: 'email', placeholder: 'staff@example.com', required: true },
      { key: 'role', label: 'Role', type: 'select', options: roles, required: true },
      { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening', 'Full day'], required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Suspended'], required: true },
    ],
  },
  settings: {
    title: 'Settings',
    singular: 'Setting',
    kicker: 'System policy',
    description: 'Access policies, offline behaviour and notification preferences.',
    columns: ['key', 'value', 'scope', 'status'],
    statusKey: 'status',
    searchKeys: ['key', 'value', 'scope'],
    fields: [
      { key: 'key', label: 'Key', placeholder: 'offlinePolicy', required: true },
      { key: 'value', label: 'Value', placeholder: 'Permitted', required: true },
      { key: 'scope', label: 'Scope', placeholder: 'Main Branch', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Enabled', 'Disabled'], required: true },
    ],
  },
}

export const navGroups: Array<{ label: string; items: Array<{ id: AdminTab; label: string }> }> = [
  { label: 'Overview', items: [{ id: 'dashboard', label: 'Command Center' }, { id: 'reports', label: 'Reports' }] },
  {
    label: 'Business',
    items: [
      { id: 'members', label: 'Members' },
      { id: 'memberships', label: 'Memberships' },
      { id: 'payments', label: 'Payments' },
      { id: 'attendance', label: 'Attendance' },
      { id: 'trainers', label: 'Trainers' },
    ],
  },
  {
    label: 'Access',
    items: [
      { id: 'biometrics', label: 'Biometrics' },
      { id: 'devices', label: 'Devices' },
      { id: 'gates', label: 'Gates' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { id: 'staff', label: 'Staff' },
      { id: 'audit', label: 'Audit Log' },
      { id: 'settings', label: 'Settings' },
    ],
  },
]

export const adminTabs = navGroups.flatMap((group) => group.items)

export const isAdminTab = (value: string | undefined): value is AdminTab => adminTabs.some((tab) => tab.id === value)

const firstNames = ['Rahul', 'Neha', 'Amit', 'Pooja', 'Arjun', 'Riya', 'Kabir', 'Ananya', 'Vikram', 'Isha', 'Rohan', 'Sneha', 'Karan', 'Meera', 'Aditya', 'Tanya', 'Siddharth', 'Kavya', 'Nikhil', 'Diya', 'Yash', 'Aisha', 'Dev', 'Nisha']
const lastNames = ['Kumar', 'Singh', 'Sharma', 'Mehta', 'Kapoor', 'Verma', 'Reddy', 'Iyer', 'Malhotra', 'Gupta', 'Nair', 'Bose']
const trainerNames = ['Coach Arjun', 'Coach Riya', 'Coach Kabir', 'Coach Zoya', 'Coach Imran']

export const createSeedData = (): AdminData => {
  const random = seededRandom(20261103)
  const pick = <T,>(items: T[]): T => items[Math.floor(random() * items.length)] as T
  const today = new Date()

  const members: ResourceRecord[] = Array.from({ length: 48 }, (_, index) => {
    const plan = pick(planCatalog)
    const expiryOffset = Math.round(random() * (plan.days + 25)) - 25
    const expiry = addDays(today, expiryOffset)
    const joined = addDays(today, -(7 + Math.floor(random() * 420)))
    const roll = random()
    const status = expiryOffset < 0 ? 'Expired' : roll < 0.08 ? 'Biometric Pending' : roll < 0.12 ? 'Suspended' : roll < 0.16 ? 'Trial' : 'Active'
    const name = `${firstNames[index % firstNames.length]} ${pick(lastNames)}`
    return {
      id: `member-${index + 1}`,
      memberCode: `GYM-${String(123 + index).padStart(6, '0')}`,
      name,
      phone: `+91 98${Math.floor(10_000_000 + random() * 89_999_999)}`,
      email: `${name.toLowerCase().replace(/\s+/g, '.')}@mail.in`,
      plan: plan.name,
      trainer: pick(trainerNames),
      status,
      joinedOn: isoDate(joined < addDays(expiry, -plan.days) ? joined : addDays(expiry, -plan.days)),
      expiry: isoDate(expiry),
    }
  })

  const payments: ResourceRecord[] = []
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo -= 1) {
    const count = 8 + Math.round((11 - monthsAgo) * 1.4 + random() * 5)
    for (let i = 0; i < count; i += 1) {
      const member = pick(members)
      const plan = planCatalog.find((item) => item.name === member.plan) ?? planCatalog[1]!
      const date = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1 + Math.floor(random() * 27))
      const roll = random()
      payments.push({
        id: `payment-${payments.length + 1}`,
        invoiceNo: `INV-${date.getFullYear()}-${String(payments.length + 1).padStart(4, '0')}`,
        memberName: member.name ?? '',
        amount: String(plan.price),
        method: random() < 0.55 ? 'UPI' : pick(paymentMethods),
        status: monthsAgo === 0 && roll < 0.2 ? 'Pending' : roll < 0.04 ? 'Failed' : roll < 0.06 ? 'Refunded' : 'Paid',
        paidAt: isoDate(date > today ? today : date),
      })
    }
  }
  payments.reverse()

  const attendance: ResourceRecord[] = []
  const hourWeights = [0, 0, 0, 0, 0, 3, 9, 10, 7, 4, 2, 2, 2, 2, 2, 3, 4, 6, 10, 11, 8, 4, 1, 0]
  const weightTotal = hourWeights.reduce((sum, value) => sum + value, 0)
  const pickHour = () => {
    let target = random() * weightTotal
    for (let hour = 0; hour < hourWeights.length; hour += 1) {
      target -= hourWeights[hour]!
      if (target <= 0) return hour
    }
    return 18
  }
  const activeMembers = members.filter((member) => member.status === 'Active' || member.status === 'Trial')
  for (let daysAgo = 13; daysAgo >= 0; daysAgo -= 1) {
    const day = addDays(today, -daysAgo)
    const weekend = day.getDay() === 0 || day.getDay() === 6
    const visits = Math.round((weekend ? 22 : 34) + random() * 14)
    for (let i = 0; i < visits; i += 1) {
      const member = pick(activeMembers)
      const hour = pickHour()
      const minute = Math.floor(random() * 60)
      const duration = 45 + Math.floor(random() * 60)
      const outMinutes = hour * 60 + minute + duration
      attendance.push({
        id: `att-${attendance.length + 1}`,
        memberName: member.name ?? '',
        memberCode: member.memberCode ?? '',
        date: isoDate(day),
        checkIn: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        checkOut: daysAgo === 0 && random() < 0.4 ? '' : `${String(Math.min(23, Math.floor(outMinutes / 60))).padStart(2, '0')}:${String(outMinutes % 60).padStart(2, '0')}`,
        method: random() < 0.86 ? 'Fingerprint' : random() < 0.5 ? 'QR' : 'Manual',
        gate: random() < 0.8 ? 'Main Turnstile' : pick(gates),
      })
    }
  }
  attendance.reverse()

  const biometrics: ResourceRecord[] = members
    .filter((member) => member.status !== 'Biometric Pending')
    .slice(0, 36)
    .map((member, index) => ({
      id: `bio-${index + 1}`,
      memberName: member.name ?? '',
      finger: pick(fingers),
      device: 'Main Entrance Fingerprint',
      quality: String(78 + Math.floor(random() * 21)),
      status: member.status === 'Expired' || member.status === 'Suspended' ? 'Revoked' : random() < 0.08 ? 'Sync Pending' : 'Active',
      lastSync: isoDate(addDays(today, -Math.floor(random() * 3))),
    }))

  return {
    members,
    memberships: planCatalog.map((plan, index) => ({
      id: `plan-${index + 1}`,
      planName: plan.name,
      duration: String(plan.days),
      price: String(plan.price),
      accessWindow: plan.window,
      perks: plan.perks,
      status: 'Active',
    })),
    payments,
    attendance,
    biometrics,
    devices: [
      { id: 'device-1', name: 'Main Entrance Fingerprint', type: 'Biometric', ipAddress: '192.168.1.40', firmware: 'v6.2.1', branch: 'Main Branch', status: 'Online', lastSync: isoDate(today) },
      { id: 'device-2', name: 'Studio Fingerprint', type: 'Biometric', ipAddress: '192.168.1.41', firmware: 'v6.2.1', branch: 'Main Branch', status: 'Online', lastSync: isoDate(today) },
      { id: 'device-3', name: 'Reception Edge Agent', type: 'Edge Agent', ipAddress: '192.168.1.10', firmware: 'agent 1.4.0', branch: 'Main Branch', status: 'Syncing', lastSync: isoDate(today) },
      { id: 'device-4', name: 'Turnstile Relay', type: 'Gate Controller', ipAddress: '192.168.1.60', firmware: 'relay 2.0', branch: 'Main Branch', status: 'Online', lastSync: isoDate(today) },
      { id: 'device-5', name: 'Lobby Camera', type: 'Camera', ipAddress: '192.168.1.80', firmware: 'cam 3.3', branch: 'Main Branch', status: 'Offline', lastSync: isoDate(addDays(today, -2)) },
    ],
    gates: [
      { id: 'gate-1', name: 'Main Turnstile', controller: 'Turnstile Relay', branch: 'Main Branch', mode: 'Normal', status: 'Online', lastEvent: '20:42:18' },
      { id: 'gate-2', name: 'Studio Door', controller: 'Maglock Relay', branch: 'Main Branch', mode: 'Normal', status: 'Online', lastEvent: '19:58:02' },
      { id: 'gate-3', name: 'Recovery Lounge', controller: 'Maglock Relay', branch: 'Main Branch', mode: 'Locked', status: 'Maintenance', lastEvent: '17:12:40' },
    ],
    trainers: trainerNames.map((name, index) => ({
      id: `trainer-${index + 1}`,
      name,
      phone: `+91 98765 4${String(1000 + index * 37).slice(0, 4)}`,
      specialty: ['Strength & powerlifting', 'HIIT & conditioning', 'Hypertrophy', 'Mobility & yoga', 'Boxing'][index] ?? 'General',
      clients: String(members.filter((member) => member.trainer === name).length),
      rating: (4.5 + random() * 0.5).toFixed(1),
      status: index === 4 ? 'On Leave' : 'Active',
    })),
    staff: [
      { id: 'staff-1', name: 'Owner Admin', email: 'owner@cultfitness.local', role: 'OWNER', shift: 'Full day', status: 'Active' },
      { id: 'staff-2', name: 'Sana Qureshi', email: 'manager@cultfitness.local', role: 'MANAGER', shift: 'Full day', status: 'Active' },
      { id: 'staff-3', name: 'Reception Desk', email: 'reception@cultfitness.local', role: 'RECEPTIONIST', shift: 'Morning', status: 'Active' },
      { id: 'staff-4', name: 'Evening Desk', email: 'evening@cultfitness.local', role: 'RECEPTIONIST', shift: 'Evening', status: 'Active' },
      { id: 'staff-5', name: 'Accounts', email: 'accounts@cultfitness.local', role: 'ACCOUNTANT', shift: 'Morning', status: 'Active' },
    ],
    settings: [
      { id: 'setting-1', key: 'offlinePolicy', value: 'Allow cached members for 24h', scope: 'Main Branch', status: 'Enabled' },
      { id: 'setting-2', key: 'biometricRequired', value: 'true', scope: 'Members', status: 'Enabled' },
      { id: 'setting-3', key: 'renewalReminderDays', value: '7', scope: 'Notifications', status: 'Enabled' },
      { id: 'setting-4', key: 'antiPassback', value: '5 minutes', scope: 'Gates', status: 'Enabled' },
      { id: 'setting-5', key: 'idleLockMinutes', value: '15', scope: 'Security', status: 'Enabled' },
    ],
    audit: [
      { id: 'audit-seed', at: today.toISOString(), actor: 'system', action: 'IMPORT', entity: 'workspace', summary: 'Demo workspace provisioned with sample data' },
    ],
  }
}
