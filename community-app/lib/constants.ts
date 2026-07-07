export const COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  primaryLight: '#A7F3D0',
  danger: '#DC2626',
  warning: '#D97706',
  info: '#2563EB',
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  card: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
}

export const SEVERITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444',
}

export const STATUS_COLORS: Record<string, string> = {
  pending: '#9CA3AF',
  ai_processed: '#3B82F6',
  verified: '#059669',
  assigned: '#D97706',
  in_progress: '#D97706',
  resolved: '#059669',
  rejected: '#EF4444',
  closed: '#9CA3AF',
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  ai_processed: 'AI Processed',
  verified: 'Verified',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  rejected: 'Rejected',
  closed: 'Closed',
}

export const CATEGORY_LABELS: Record<string, string> = {
  pothole: 'Pothole',
  road_damage: 'Road Damage',
  water_leak: 'Water Leak',
  sewage: 'Sewage',
  streetlight: 'Streetlight',
  garbage: 'Garbage',
  illegal_dumping: 'Illegal Dumping',
  fallen_tree: 'Fallen Tree',
  park_damage: 'Park Damage',
  other: 'Other',
}

export const CATEGORY_ICONS: Record<string, string> = {
  pothole: 'car-sport',
  road_damage: 'car',
  water_leak: 'water',
  sewage: 'construct',
  streetlight: 'bulb',
  garbage: 'trash',
  illegal_dumping: 'trash-bin',
  fallen_tree: 'leaf',
  park_damage: 'leaf',
  other: 'help-circle',
}

export const NOTIFICATION_ICONS: Record<string, string> = {
  issue_verified: 'shield-check',
  issue_assigned: 'hard-hat',
  issue_updated: 'information',
  issue_resolved: 'check-circle',
  verification_milestone: 'account-group',
  badge_earned: 'trophy',
}

export const NOTIFICATION_COLORS: Record<string, string> = {
  issue_verified: '#059669',
  issue_assigned: '#D97706',
  issue_updated: '#2563EB',
  issue_resolved: '#059669',
  verification_milestone: '#7C3AED',
  badge_earned: '#F59E0B',
}

export const BADGE_LABELS: Record<string, string> = {
  first_report: 'First Responder',
  neighborhood_watch: 'Neighborhood Watch',
  problem_solver: 'Problem Solver',
  community_pillar: 'Community Pillar',
  speed_reporter: 'Speed Reporter',
  top_hero: 'City Hero',
  verified_reporter: 'Verified Reporter',
  super_verifier: 'Super Verifier',
}

export const BADGE_CRITERIA: Record<string, string> = {
  first_report: 'Submit more than 1 issue',
  neighborhood_watch: 'Reach 100 hero score',
  problem_solver: 'Reach 200 hero score',
  community_pillar: 'Reach 400 hero score',
  speed_reporter: 'Reach 30 hero score',
  top_hero: 'Reach 700 hero score',
  verified_reporter: 'Submit more than 5 issues and get all resolved',
  super_verifier: 'Submit more than 10 issues',
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  ai_processed: ['assigned', 'rejected'],
  verified: ['assigned', 'rejected'],
  assigned: ['in_progress', 'rejected'],
  in_progress: ['resolved'],
}

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
}

export const FONT_SIZES = {
  h1: 24,
  h2: 20,
  h3: 18,
  body: 16,
  bodySm: 14,
  caption: 12,
}

export const BORDER_RADIUS = {
  card: 12,
  button: 8,
  badge: 16,
  input: 8,
  modal: 16,
}
