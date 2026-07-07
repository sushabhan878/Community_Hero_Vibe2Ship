import { Request } from 'express';

export interface AuthPayload {
  sub: string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface AuthRequest extends Request {
  userId?: string;
  profile?: ProfileRow;
}

export interface ProfileRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string;
  department_id: string | null;
  is_active: boolean;
  hero_score: number;
  total_reports: number;
  total_resolved: number;
  total_verified: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface IssueRow {
  id: string;
  reporter_id: string;
  title: string;
  description: string | null;
  image_urls: string[];
  video_url: string | null;
  category: string;
  severity: string;
  ai_category: string | null;
  ai_severity: string | null;
  ai_summary: string | null;
  ai_confidence: number | null;
  ai_is_duplicate: boolean | null;
  ai_duplicate_of: string | null;
  ai_processed_at: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  ward: string | null;
  status: string;
  assigned_department_id: string | null;
  assigned_at: string | null;
  upvote_count: number;
  verification_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  deleted_at: string | null;
}

export interface DepartmentRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface BadgeRow {
  slug: string;
  awarded_at: string;
}

export interface VerificationRow {
  id: string;
  issue_id: string;
  user_id: string;
  created_at: string;
}

export interface IssueUpdateRow {
  id: string;
  issue_id: string;
  updated_by: string;
  type: string;
  old_status: string | null;
  new_status: string | null;
  note: string | null;
  extra_meta: Record<string, unknown> | null;
  created_at: string;
}

export interface PushTokenRow {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  issue_id: string | null;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}
