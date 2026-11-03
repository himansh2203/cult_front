import { CalendarCheck, ChartBar, Cpu, CreditCard, DoorOpen, Dumbbell, FingerprintPattern, IdCard, LayoutDashboard, ScrollText, Settings, UserCog, Users } from 'lucide-react'
import type { AdminTab } from '../lib/types'

export const tabIcons: Record<AdminTab, typeof Users> = {
  dashboard: LayoutDashboard,
  reports: ChartBar,
  members: Users,
  memberships: IdCard,
  payments: CreditCard,
  attendance: CalendarCheck,
  trainers: Dumbbell,
  biometrics: FingerprintPattern,
  devices: Cpu,
  gates: DoorOpen,
  staff: UserCog,
  audit: ScrollText,
  settings: Settings,
}
