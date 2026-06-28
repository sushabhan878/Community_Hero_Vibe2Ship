import type { IssueStatus, IssueSeverity, IssueCategory } from '@/types'

export const NAV_ITEMS = [
  { label: 'Overview', href: '/dashboard', icon: 'LayoutDashboard', roles: ['department_admin', 'super_admin'] },
  { label: 'Issues', href: '/dashboard/issues', icon: 'AlertTriangle', roles: ['department_admin', 'super_admin'] },
  { label: 'Analytics', href: '/dashboard/analytics', icon: 'BarChart3', roles: ['department_admin', 'super_admin'] },
  { label: 'Leaderboard', href: '/dashboard/leaderboard', icon: 'Trophy', roles: ['department_admin', 'super_admin'] },
  { label: 'Notifications', href: '/dashboard/notifications', icon: 'Bell', roles: ['department_admin', 'super_admin'] },
]

export const ADMIN_NAV_ITEMS = [
  { label: 'Users', href: '/dashboard/admin/users', icon: 'Users' },
  { label: 'Departments', href: '/dashboard/admin/departments', icon: 'Building2' },
]

export const STATUS_OPTIONS: { label: string; value: IssueStatus }[] = [
  { label: 'Pending', value: 'pending' },
  { label: 'AI Processed', value: 'ai_processed' },
  { label: 'Verified', value: 'verified' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Closed', value: 'closed' },
]

export const SEVERITY_OPTIONS: { label: string; value: IssueSeverity }[] = [
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
]

export const CATEGORY_OPTIONS: { label: string; value: IssueCategory }[] = [
  { label: 'Pothole', value: 'pothole' },
  { label: 'Road Damage', value: 'road_damage' },
  { label: 'Water Leak', value: 'water_leak' },
  { label: 'Sewage', value: 'sewage' },
  { label: 'Streetlight', value: 'streetlight' },
  { label: 'Garbage', value: 'garbage' },
  { label: 'Illegal Dumping', value: 'illegal_dumping' },
  { label: 'Fallen Tree', value: 'fallen_tree' },
  { label: 'Park Damage', value: 'park_damage' },
  { label: 'Other', value: 'other' },
]

export const VALID_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  assigned: ['in_progress'],
  in_progress: ['resolved'],
  resolved: ['in_progress'],
  pending: [],
  ai_processed: [],
  verified: [],
  rejected: [],
  closed: [],
}

export const CITY_CENTER: [number, number] = [12.971598, 77.594566]
export const DEFAULT_MAP_ZOOM = 12
