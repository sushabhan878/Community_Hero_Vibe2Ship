-- ============================================================
-- Community Hero AI — Initial Schema Migration
-- Source: PRD-01 Database Schema
-- Run this in Supabase SQL Editor or via scripts/init_db.py
-- ============================================================

-- ######################
-- 1. EXTENSIONS
-- ######################
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ######################
-- 2. ENUMS
-- ######################
CREATE TYPE user_role AS ENUM ('citizen', 'department_admin', 'super_admin');

CREATE TYPE department_slug AS ENUM (
  'roads', 'water', 'electricity', 'waste', 'parks', 'other'
);

CREATE TYPE issue_category AS ENUM (
  'pothole', 'road_damage', 'water_leak', 'sewage',
  'streetlight', 'garbage', 'illegal_dumping',
  'fallen_tree', 'park_damage', 'other'
);

CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE issue_status AS ENUM (
  'pending', 'ai_processed', 'verified', 'assigned',
  'in_progress', 'resolved', 'rejected', 'closed'
);

CREATE TYPE update_type AS ENUM (
  'status_change', 'department_assigned',
  'note_added', 'ai_processed', 'verification_milestone'
);

CREATE TYPE notification_type AS ENUM (
  'issue_verified', 'issue_assigned', 'issue_updated',
  'issue_resolved', 'verification_milestone', 'badge_earned'
);

CREATE TYPE badge_slug AS ENUM (
  'first_report', 'neighborhood_watch', 'problem_solver',
  'community_pillar', 'speed_reporter', 'top_hero'
);

-- ######################
-- 3. TABLES
-- ######################

-- 3a. departments
CREATE TABLE departments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  slug          department_slug NOT NULL UNIQUE,
  description   text,
  contact_email text,
  contact_phone text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

-- 3b. profiles (extends auth.users)
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text,
  phone           text,
  avatar_url      text,
  role            user_role NOT NULL DEFAULT 'citizen',
  department_id   uuid REFERENCES departments(id),
  hero_score      integer NOT NULL DEFAULT 0,
  total_reports   integer NOT NULL DEFAULT 0,
  total_resolved  integer NOT NULL DEFAULT 0,
  total_verified  integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT dept_admin_needs_dept CHECK (
    role != 'department_admin' OR department_id IS NOT NULL
  )
);

-- 3c. issues
CREATE TABLE issues (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id           uuid NOT NULL REFERENCES profiles(id),
  title                 text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 100),
  description           text CHECK (char_length(description) <= 1000),
  image_urls            text[] NOT NULL DEFAULT '{}',
  video_url             text,
  category              issue_category NOT NULL DEFAULT 'other',
  severity              issue_severity NOT NULL DEFAULT 'medium',
  ai_category           issue_category,
  ai_severity           issue_severity,
  ai_summary            text,
  ai_confidence         numeric(4,3),
  ai_is_duplicate       boolean DEFAULT false,
  ai_duplicate_of       uuid REFERENCES issues(id),
  ai_processed_at       timestamptz,
  latitude              numeric(10, 7) NOT NULL,
  longitude             numeric(10, 7) NOT NULL,
  address               text,
  ward                  text,
  location              geography(POINT, 4326),
  status                issue_status NOT NULL DEFAULT 'pending',
  assigned_department_id uuid REFERENCES departments(id),
  assigned_at           timestamptz,
  upvote_count          integer NOT NULL DEFAULT 0,
  verification_count    integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz,
  deleted_at            timestamptz
);

-- 3d. verifications
CREATE TABLE verifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id   uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_verification UNIQUE (issue_id, user_id)
);

-- 3e. issue_updates (audit log)
CREATE TABLE issue_updates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  updated_by  uuid NOT NULL REFERENCES profiles(id),
  type        update_type NOT NULL,
  old_status  issue_status,
  new_status  issue_status,
  note        text CHECK (char_length(note) <= 500),
  extra_meta  jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 3f. notifications
CREATE TABLE notifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  issue_id   uuid REFERENCES issues(id) ON DELETE SET NULL,
  type       notification_type NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3g. badges
CREATE TABLE badges (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug        badge_slug NOT NULL,
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_badge UNIQUE (user_id, slug)
);

-- 3h. push_tokens
CREATE TABLE push_tokens (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_token UNIQUE (token)
);

-- ######################
-- 4. INDEXES
-- ######################

-- profiles
CREATE INDEX idx_profiles_hero_score ON profiles(hero_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;

-- issues
CREATE INDEX idx_issues_reporter ON issues(reporter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_status ON issues(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_category ON issues(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_department ON issues(assigned_department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_created ON issues(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_location ON issues USING GIST(location);

-- verifications
CREATE INDEX idx_verifications_issue ON verifications(issue_id);
CREATE INDEX idx_verifications_user ON verifications(user_id);

-- issue_updates
CREATE INDEX idx_issue_updates_issue ON issue_updates(issue_id, created_at DESC);

-- notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC) WHERE read = false;

-- badges
CREATE INDEX idx_badges_user ON badges(user_id);

-- push_tokens
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);

-- ######################
-- 5. TRIGGERS & FUNCTIONS
-- ######################

-- 5a. Auto-set PostGIS point from lat/lon
CREATE OR REPLACE FUNCTION set_issue_location()
RETURNS TRIGGER AS $$
BEGIN
  NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_issue_location
  BEFORE INSERT OR UPDATE OF latitude, longitude ON issues
  FOR EACH ROW EXECUTE FUNCTION set_issue_location();

-- 5b. Auto-update updated_at on issues
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5c. Verification insert: increment count, promote status at threshold 5
CREATE OR REPLACE FUNCTION on_verification_insert()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE issues SET verification_count = verification_count + 1
  WHERE id = NEW.issue_id;

  UPDATE issues SET status = 'verified'
  WHERE id = NEW.issue_id
    AND status = 'ai_processed'
    AND verification_count >= 5;

  UPDATE profiles SET total_verified = total_verified + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_verification_insert
  AFTER INSERT ON verifications
  FOR EACH ROW EXECUTE FUNCTION on_verification_insert();

-- 5d. Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5e. Update profile.updated_at trigger
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5f. Update push_tokens.updated_at trigger
CREATE TRIGGER trg_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ######################
-- 6. ROW LEVEL SECURITY
-- ######################

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT
  USING (deleted_at IS NULL);

CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- issues
CREATE POLICY "issues_read_all" ON issues FOR SELECT
  USING (deleted_at IS NULL AND auth.role() = 'authenticated');

CREATE POLICY "issues_insert_citizen" ON issues FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "issues_update_own_pending" ON issues FOR UPDATE
  USING (auth.uid() = reporter_id AND status = 'pending');

CREATE POLICY "issues_update_dept_admin" ON issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'department_admin'
        AND department_id = issues.assigned_department_id
    )
  );

CREATE POLICY "issues_update_super_admin" ON issues FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- verifications
CREATE POLICY "verifications_read_all" ON verifications FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "verifications_insert" ON verifications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM issues WHERE id = issue_id AND reporter_id = auth.uid()
    )
  );

-- notifications
CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- issue_updates
CREATE POLICY "issue_updates_read_all" ON issue_updates FOR SELECT
  USING (auth.role() = 'authenticated');

-- departments
CREATE POLICY "departments_read_all" ON departments FOR SELECT
  USING (true);

-- ######################
-- 7. SEED DATA
-- ######################

INSERT INTO departments (name, slug, contact_email) VALUES
  ('Roads & Infrastructure', 'roads', 'roads@city.gov'),
  ('Water & Sewage', 'water', 'water@city.gov'),
  ('Electricity & Lighting', 'electricity', 'electricity@city.gov'),
  ('Waste Management', 'waste', 'waste@city.gov'),
  ('Parks & Recreation', 'parks', 'parks@city.gov'),
  ('General Services', 'other', 'general@city.gov')
ON CONFLICT (slug) DO NOTHING;
