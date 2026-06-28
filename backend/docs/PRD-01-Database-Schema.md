# PRD-01: Database Schema & Migrations

## Overview
Define the complete PostgreSQL schema on Supabase — all tables, enums, indexes, foreign keys, RLS policies, and triggers. This is the foundation every other PRD builds on top of.

## Extensions Required
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";      -- geo queries, proximity search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- fuzzy text search on issue titles
```

---

## Enums

```sql
CREATE TYPE user_role AS ENUM ('citizen', 'department_admin', 'super_admin');

CREATE TYPE department_slug AS ENUM (
  'roads',        -- potholes, road damage
  'water',        -- leaks, sewage
  'electricity',  -- streetlights, wiring
  'waste',        -- garbage, dumping
  'parks',        -- parks, trees
  'other'         -- catch-all
);

CREATE TYPE issue_category AS ENUM (
  'pothole', 'road_damage', 'water_leak', 'sewage',
  'streetlight', 'garbage', 'illegal_dumping',
  'fallen_tree', 'park_damage', 'other'
);

CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE issue_status AS ENUM (
  'pending',      -- just submitted, awaiting AI
  'ai_processed', -- AI categorized, not yet verified
  'verified',     -- community verified (threshold met)
  'assigned',     -- assigned to a department
  'in_progress',  -- department acknowledged and working
  'resolved',     -- department marked resolved
  'rejected',     -- flagged as invalid/duplicate/spam
  'closed'        -- auto-closed after 30 days if no activity
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
  'first_report',        -- first ever issue reported
  'neighborhood_watch',  -- 10 issues reported
  'problem_solver',      -- 5 issues resolved
  'community_pillar',    -- 50 verifications given
  'speed_reporter',      -- reported within 1hr of issue creation
  'top_hero'             -- top 10 hero score in city
);
```

---

## Tables

### 1. `departments`
```sql
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

-- Seed data (run after migration)
INSERT INTO departments (name, slug, contact_email) VALUES
  ('Roads & Infrastructure', 'roads', 'roads@city.gov'),
  ('Water & Sewage', 'water', 'water@city.gov'),
  ('Electricity & Lighting', 'electricity', 'electricity@city.gov'),
  ('Waste Management', 'waste', 'waste@city.gov'),
  ('Parks & Recreation', 'parks', 'parks@city.gov'),
  ('General Services', 'other', 'general@city.gov');
```

### 2. `profiles`
Extends Supabase `auth.users`. Created automatically via trigger on signup.
```sql
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  phone           text,
  avatar_url      text,
  role            user_role NOT NULL DEFAULT 'citizen',
  department_id   uuid REFERENCES departments(id),  -- only for department_admin
  hero_score      integer NOT NULL DEFAULT 0,
  total_reports   integer NOT NULL DEFAULT 0,
  total_resolved  integer NOT NULL DEFAULT 0,
  total_verified  integer NOT NULL DEFAULT 0,       -- verifications given
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  CONSTRAINT dept_admin_needs_dept CHECK (
    role != 'department_admin' OR department_id IS NOT NULL
  )
);

-- Index for leaderboard
CREATE INDEX idx_profiles_hero_score ON profiles(hero_score DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_role ON profiles(role) WHERE deleted_at IS NULL;
```

### 3. `issues`
Core table. Every civic report lives here.
```sql
CREATE TABLE issues (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reporter
  reporter_id           uuid NOT NULL REFERENCES profiles(id),

  -- Content
  title                 text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 100),
  description           text CHECK (char_length(description) <= 1000),
  image_urls            text[] NOT NULL DEFAULT '{}',   -- Supabase Storage paths
  video_url             text,

  -- Classification (user-submitted)
  category              issue_category NOT NULL DEFAULT 'other',
  severity              issue_severity NOT NULL DEFAULT 'medium',

  -- AI Classification (filled by Edge Function after submit)
  ai_category           issue_category,
  ai_severity           issue_severity,
  ai_summary            text,                -- 1-sentence AI description
  ai_confidence         numeric(4,3),        -- 0.000 to 1.000
  ai_is_duplicate       boolean DEFAULT false,
  ai_duplicate_of       uuid REFERENCES issues(id),
  ai_processed_at       timestamptz,

  -- Location
  latitude              numeric(10, 7) NOT NULL,
  longitude             numeric(10, 7) NOT NULL,
  address               text,               -- reverse geocoded
  ward                  text,               -- optional civic ward
  location              geography(POINT, 4326),  -- PostGIS for proximity queries

  -- Status & Routing
  status                issue_status NOT NULL DEFAULT 'pending',
  assigned_department_id uuid REFERENCES departments(id),
  assigned_at           timestamptz,

  -- Community
  upvote_count          integer NOT NULL DEFAULT 0,   -- denormalized count
  verification_count    integer NOT NULL DEFAULT 0,   -- verifications given

  -- Timestamps
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  resolved_at           timestamptz,
  deleted_at            timestamptz
);

-- Indexes
CREATE INDEX idx_issues_reporter ON issues(reporter_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_status ON issues(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_category ON issues(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_department ON issues(assigned_department_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_created ON issues(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_issues_location ON issues USING GIST(location);  -- spatial index

-- Auto-set PostGIS point from lat/lon
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

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_issues_updated_at
  BEFORE UPDATE ON issues
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4. `verifications`
One upvote per user per issue.
```sql
CREATE TABLE verifications (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id   uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_verification UNIQUE (issue_id, user_id)  -- one vote per user per issue
);

-- Cannot verify own issue (enforced in Edge Function + RLS)
CREATE INDEX idx_verifications_issue ON verifications(issue_id);
CREATE INDEX idx_verifications_user ON verifications(user_id);

-- Trigger: increment issue.verification_count + update status if threshold met
CREATE OR REPLACE FUNCTION on_verification_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment denormalized count
  UPDATE issues SET verification_count = verification_count + 1
  WHERE id = NEW.issue_id;

  -- If threshold reached (5 verifications) and status is ai_processed → verified
  UPDATE issues SET status = 'verified'
  WHERE id = NEW.issue_id
    AND status = 'ai_processed'
    AND verification_count >= 5;

  -- Increment verifier's total_verified count
  UPDATE profiles SET total_verified = total_verified + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_verification_insert
  AFTER INSERT ON verifications
  FOR EACH ROW EXECUTE FUNCTION on_verification_insert();
```

### 5. `issue_updates`
Append-only audit log of all status changes and notes.
```sql
CREATE TABLE issue_updates (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id    uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  updated_by  uuid NOT NULL REFERENCES profiles(id),
  type        update_type NOT NULL,
  old_status  issue_status,
  new_status  issue_status,
  note        text CHECK (char_length(note) <= 500),
  metadata    jsonb DEFAULT '{}',  -- flexible: AI scores, dept info, etc.
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- No soft delete on audit log — it's immutable
CREATE INDEX idx_issue_updates_issue ON issue_updates(issue_id, created_at DESC);
```

### 6. `notifications`
```sql
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

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC) WHERE read = false;
```

### 7. `badges`
```sql
CREATE TABLE badges (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  slug        badge_slug NOT NULL,
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_badge UNIQUE (user_id, slug)  -- each badge awarded once
);

CREATE INDEX idx_badges_user ON badges(user_id);
```

### 8. `push_tokens`
For Expo push notifications.
```sql
CREATE TABLE push_tokens (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL CHECK (platform IN ('ios', 'android')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_token UNIQUE (token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
```

---

## Row-Level Security (RLS)

Enable RLS on all tables:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
```

### `profiles` Policies
```sql
-- Anyone can read public profiles
CREATE POLICY "profiles_read_all" ON profiles FOR SELECT USING (deleted_at IS NULL);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Insert handled by trigger (not client)
```

### `issues` Policies
```sql
-- All authenticated users can read non-deleted issues
CREATE POLICY "issues_read_all" ON issues FOR SELECT
  USING (deleted_at IS NULL AND auth.role() = 'authenticated');

-- Citizens can insert issues
CREATE POLICY "issues_insert_citizen" ON issues FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Citizens can update their own pending issues only
CREATE POLICY "issues_update_own_pending" ON issues FOR UPDATE
  USING (auth.uid() = reporter_id AND status = 'pending');

-- Department admins can update issues assigned to their department
CREATE POLICY "issues_update_dept_admin" ON issues FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'department_admin'
        AND department_id = issues.assigned_department_id
    )
  );

-- Super admins can update anything
CREATE POLICY "issues_update_super_admin" ON issues FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
```

### `verifications` Policies
```sql
CREATE POLICY "verifications_read_all" ON verifications FOR SELECT
  USING (auth.role() = 'authenticated');

-- Can verify any issue except their own
CREATE POLICY "verifications_insert" ON verifications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    NOT EXISTS (
      SELECT 1 FROM issues WHERE id = issue_id AND reporter_id = auth.uid()
    )
  );
```

### `notifications` Policies
```sql
-- Users see only their own notifications
CREATE POLICY "notifications_own" ON notifications FOR ALL
  USING (auth.uid() = user_id);
```

### `issue_updates` Policies
```sql
CREATE POLICY "issue_updates_read_all" ON issue_updates FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only Edge Functions (service role) write to audit log
```

### `departments` Policies
```sql
CREATE POLICY "departments_read_all" ON departments FOR SELECT
  USING (true);  -- public read

-- Only service role can write
```

---

## Auto-Profile Creation Trigger
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Storage Buckets
```sql
-- In Supabase dashboard or via API:
-- Bucket: "issue-media" (public: false, max file size: 50MB)
-- Allowed MIME types: image/jpeg, image/png, image/webp, video/mp4

-- RLS on storage: users can upload to their own folder only
-- Path convention: issue-media/{user_id}/{issue_id}/{filename}
```

---

## Migration File Order
```
001_extensions.sql
002_enums.sql
003_departments.sql
004_profiles.sql
005_issues.sql
006_verifications.sql
007_issue_updates.sql
008_notifications.sql
009_badges.sql
010_push_tokens.sql
011_rls_policies.sql
012_triggers.sql
013_seed_departments.sql
```

## Acceptance Criteria
- [ ] All tables created with correct constraints
- [ ] PostGIS `location` column auto-populated on insert/update
- [ ] `updated_at` auto-updates on every UPDATE
- [ ] New auth user → profile auto-created
- [ ] Verification insert → issue count increments, status changes at threshold 5
- [ ] RLS blocks cross-user data access (verified with `anon` and different JWT tests)
- [ ] Storage bucket created with correct MIME type restrictions
