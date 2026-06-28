export type UserRole = 'citizen' | 'department_admin' | 'super_admin'

export type DepartmentSlug = 'roads' | 'water' | 'electricity' | 'waste' | 'parks' | 'other'

export type IssueCategory =
  | 'pothole' | 'road_damage' | 'water_leak' | 'sewage'
  | 'streetlight' | 'garbage' | 'illegal_dumping'
  | 'fallen_tree' | 'park_damage' | 'other'

export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

export type IssueStatus =
  | 'pending' | 'ai_processed' | 'verified' | 'assigned'
  | 'in_progress' | 'resolved' | 'rejected' | 'closed'

export type NotificationType =
  | 'issue_verified' | 'issue_assigned' | 'issue_updated'
  | 'issue_resolved' | 'verification_milestone' | 'badge_earned'

export type BadgeSlug =
  | 'first_report' | 'neighborhood_watch' | 'problem_solver'
  | 'community_pillar' | 'speed_reporter' | 'top_hero'
  | 'verified_reporter' | 'super_verifier'

export interface Profile {
  id: string
  name: string
  email?: string
  phone?: string
  avatar_url?: string
  role: UserRole
  department_id?: string
  hero_score: number
  total_reports: number
  total_resolved: number
  total_verified: number
  is_active: boolean
  created_at: string
}

export interface Department {
  id: string
  name: string
  slug: DepartmentSlug
  description?: string
  contact_email?: string
  contact_phone?: string
  is_active: boolean
}

export interface Issue {
  id: string
  reporter_id: string
  title: string
  description?: string
  image_urls: string[]
  video_url?: string
  category: IssueCategory
  severity: IssueSeverity
  ai_category?: IssueCategory
  ai_severity?: IssueSeverity
  ai_summary?: string
  ai_confidence?: number
  ai_is_duplicate?: boolean
  ai_duplicate_of?: string
  ai_processed_at?: string
  latitude: number
  longitude: number
  address?: string
  ward?: string
  status: IssueStatus
  assigned_department_id?: string
  assigned_at?: string
  upvote_count: number
  verification_count: number
  created_at: string
  updated_at: string
  resolved_at?: string
  reporter?: { id: string; name: string; avatar_url?: string; hero_score?: number }
  assigned_department?: { id: string; name: string }
  has_verified?: boolean
  days_open?: number
}

export interface IssueUpdate {
  id: string
  issue_id: string
  updated_by: string
  type: 'status_change' | 'department_assigned' | 'note_added' | 'ai_processed' | 'verification_milestone'
  old_status?: IssueStatus
  new_status?: IssueStatus
  note?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_by_user?: { name: string; role: string }
}

export interface Notification {
  id: string
  user_id: string
  issue_id?: string
  type: NotificationType
  title: string
  body: string
  read: boolean
  created_at: string
}

export interface Badge {
  id: string
  user_id: string
  slug: BadgeSlug
  awarded_at: string
}

export interface OverviewStats {
  period: string
  kpis: {
    total_issues: number
    total_issues_delta: number
    resolved_issues: number
    resolution_rate: number
    avg_resolution_hours: number
    open_issues: number
    critical_open: number
    verified_rate: number
  }
  by_status: Record<string, number>
  by_category: { category: string; count: number; resolved: number }[]
  by_severity: Record<string, number>
}

export interface TrendDataPoint {
  date: string
  count: number
}

export interface TrendsData {
  series: TrendDataPoint[]
  total: number
  peak_day: { date: string; count: number }
}

export interface HeatmapPoint {
  latitude: number
  longitude: number
  weight: number
  category: string
  severity: string
}

export interface DepartmentStats {
  id: string
  name: string
  slug: string
  stats: {
    total_assigned: number
    resolved: number
    in_progress: number
    overdue: number
    avg_resolution_hours: number
    resolution_rate: number
  }
}

export interface LeaderboardEntry {
  rank: number
  user: {
    id: string
    name: string
    avatar_url?: string
    hero_score: number
    total_reports: number
    total_resolved: number
    badges: string[]
  }
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  my_rank?: {
    rank: number
    hero_score: number
    percentile: number
  }
  total_participants: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  has_more: boolean
}
