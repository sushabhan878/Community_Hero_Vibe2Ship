-- Run this in Supabase Dashboard → SQL Editor
-- Creates all tables needed by the dashboard

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS departments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  contact_email text,
  contact_phone text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

INSERT INTO departments (name, slug, contact_email) VALUES
  ('Roads & Infrastructure', 'roads', 'roads@city.gov'),
  ('Water & Sewage', 'water', 'water@city.gov'),
  ('Electricity & Lighting', 'electricity', 'electricity@city.gov'),
  ('Waste Management', 'waste', 'waste@city.gov'),
  ('Parks & Recreation', 'parks', 'parks@city.gov'),
  ('General Services', 'other', 'general@city.gov')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY,
  name            text NOT NULL,
  email           text,
  phone           text,
  avatar_url      text,
  role            text NOT NULL DEFAULT 'citizen',
  department_id   uuid REFERENCES departments(id),
  hero_score      integer NOT NULL DEFAULT 0,
  total_reports   integer NOT NULL DEFAULT 0,
  total_resolved  integer NOT NULL DEFAULT 0,
  total_verified  integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE TABLE IF NOT EXISTS issues (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id           uuid NOT NULL,
  title                 text NOT NULL,
  description           text,
  image_urls            text[] NOT NULL DEFAULT '{}',
  video_url             text,
  category              text NOT NULL DEFAULT 'other',
  severity              text NOT NULL DEFAULT 'medium',
  ai_category           text,
  ai_severity           text,
  ai_summary            text,
  ai_confidence         numeric(4,3),
  ai_is_duplicate       boolean DEFAULT false,
  ai_duplicate_of       uuid,
  ai_processed_at       timestamptz,
  latitude              numeric(10,7) NOT NULL DEFAULT 0,
  longitude             numeric(10,7) NOT NULL DEFAULT 0,
  address               text,
  ward                  text,
  status                text NOT NULL DEFAULT 'pending',
  assigned_department_id uuid REFERENCES departments(id),
  assigned_at           timestamptz,
  upvote_count          integer NOT NULL DEFAULT 0,
  verification_count    integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz,
  deleted_at            timestamptz
);

CREATE TABLE IF NOT EXISTS verifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id   uuid NOT NULL,
  user_id    uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_verification UNIQUE (issue_id, user_id)
);

CREATE TABLE IF NOT EXISTS issue_updates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    uuid NOT NULL,
  updated_by  uuid NOT NULL,
  type        text NOT NULL,
  old_status  text,
  new_status  text,
  note        text,
  metadata    jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL,
  issue_id   uuid,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS badges (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL,
  slug        text NOT NULL,
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_badge UNIQUE (user_id, slug)
);

CREATE TABLE IF NOT EXISTS push_tokens (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL,
  token      text NOT NULL,
  platform   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_token UNIQUE (token)
);

-- Enable RLS (optional for dashboard-only use, but good practice)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read
CREATE POLICY "read_all" ON departments FOR SELECT USING (true);
CREATE POLICY "read_all" ON profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "read_all" ON issues FOR SELECT USING (auth.role() = 'authenticated');
