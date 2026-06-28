# Community Hero AI — Backend PRD Master Index

## Project Overview
Community Hero AI is a hyperlocal civic issue management platform. Citizens report potholes, water leaks, garbage, broken streetlights, and other civic problems. AI categorizes, routes, and tracks them. Department admins resolve them. Community members verify them.

## Stack (Backend)
| Layer | Technology |
|---|---|
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| File Storage | Supabase Storage |
| Realtime | Supabase Realtime (Postgres CDC) |
| Edge Functions | Supabase Edge Functions (Deno/TypeScript) |
| AI | Google Gemini 2.5 Flash (via Edge Function) |
| Maps/Geo | PostGIS extension on Supabase |
| Push Notifications | Expo Push Notification Service |

## PRD Breakdown

| # | PRD | Scope | Priority |
|---|---|---|---|
| 01 | Database Schema & Migrations | All tables, enums, indexes, RLS policies | P0 |
| 02 | Authentication & User Profiles | Supabase Auth, roles, profile creation | P0 |
| 03 | Issue Reporting API | Issue CRUD, media upload, geo-tagging | P0 |
| 04 | AI Processing Pipeline | Gemini categorization, severity, routing | P0 |
| 05 | Community Verification System | Upvotes, threshold logic, fraud prevention | P1 |
| 06 | Issue Status & Lifecycle Management | Status transitions, updates, audit trail | P0 |
| 07 | Department Routing & Assignment | Auto-assign, manual override, escalation | P1 |
| 08 | Realtime & Notifications | Supabase Realtime, push notifications | P1 |
| 09 | Gamification & Hero Score | Points, badges, leaderboard | P2 |
| 10 | Analytics & Predictive Insights | Aggregations, heatmaps, trend data | P2 |

## Build Order (Hackathon Sequence)
```
Day 1 Morning:   PRD-01 (Schema) → PRD-02 (Auth)
Day 1 Afternoon: PRD-03 (Issue Reporting) → PRD-06 (Lifecycle)
Day 1 Evening:   PRD-07 (Department Routing)
Day 2 Morning:   PRD-04 (AI Pipeline) → PRD-05 (Verification)
Day 2 Afternoon: PRD-08 (Realtime) → PRD-09 (Gamification)
Day 2 Evening:   PRD-10 (Analytics) → Polish & Deploy
```

## Shared Conventions (applies to all PRDs)

### Response Envelope
All Edge Functions return:
```json
{ "success": true, "data": {}, "error": null }
{ "success": false, "data": null, "error": { "code": "ERROR_CODE", "message": "..." } }
```

### Auth Headers
All protected Edge Functions require:
```
Authorization: Bearer <supabase_jwt>
```

### Timestamp Convention
All timestamps stored as `timestamptz` in UTC. Clients convert to local time.

### Soft Delete
No hard deletes. All tables have `deleted_at timestamptz` nullable. Queries filter `WHERE deleted_at IS NULL`.
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
# PRD-02: Authentication & User Profiles

## Overview
Handle user sign-up, sign-in, session management, and profile CRUD using Supabase Auth. Support three roles: `citizen`, `department_admin`, `super_admin`. Citizens sign up via mobile app; admins are created by super_admin via dashboard.

---

## Auth Methods

| Method | Used By | Notes |
|---|---|---|
| Email + Password | All roles | Primary method |
| Google OAuth | Citizens (mobile) | Optional, nice-to-have |
| Magic Link | Department admins | For dashboard onboarding |

---

## Edge Functions

### `POST /auth/signup`
**Invoked by:** Mobile app (citizen registration)

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "min8chars",
  "name": "Rajan Mehta",
  "phone": "+919876543210"   // optional
}
```

**Logic:**
1. Validate: email format, password min 8 chars, name non-empty
2. Call `supabase.auth.signUp({ email, password, options: { data: { name } } })`
3. Supabase trigger auto-creates `profiles` row (from PRD-01 trigger)
4. If `phone` provided, update `profiles` row with phone
5. Return session tokens

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "name": "..." },
    "session": { "access_token": "...", "refresh_token": "..." }
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `EMAIL_TAKEN` | Email already registered |
| `WEAK_PASSWORD` | Password < 8 chars |
| `INVALID_EMAIL` | Bad email format |

---

### `POST /auth/signin`
**Invoked by:** Mobile app + Dashboard

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Logic:**
1. Call `supabase.auth.signInWithPassword({ email, password })`
2. Fetch `profiles` row for user (to get role, hero_score, department_id)
3. Return session + profile

**Response:**
```json
{
  "success": true,
  "data": {
    "session": { "access_token": "...", "refresh_token": "...", "expires_at": 1234567890 },
    "profile": {
      "id": "uuid",
      "name": "Rajan Mehta",
      "role": "citizen",
      "hero_score": 120,
      "department_id": null,
      "avatar_url": null
    }
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `INVALID_CREDENTIALS` | Wrong email/password |
| `ACCOUNT_DISABLED` | `is_active = false` |

---

### `POST /auth/signout`
**Auth required:** Yes

**Logic:**
1. Call `supabase.auth.signOut()`
2. Invalidate the push token for this device (delete from `push_tokens`)

**Request Body:**
```json
{ "push_token": "ExponentPushToken[...]" }  // optional, to deregister device
```

---

### `POST /auth/refresh`
**Invoked by:** Both clients (auto, on token expiry)

**Request Body:**
```json
{ "refresh_token": "..." }
```

**Logic:** Proxy to `supabase.auth.refreshSession()`

---

### `POST /auth/forgot-password`
**Request Body:**
```json
{ "email": "user@example.com" }
```

**Logic:** Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: "..." })`

---

## Profile Endpoints

### `GET /profile/me`
**Auth required:** Yes

Returns the authenticated user's full profile.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Rajan Mehta",
    "email": "rajan@example.com",
    "phone": "+91...",
    "avatar_url": "https://...",
    "role": "citizen",
    "hero_score": 250,
    "total_reports": 12,
    "total_resolved": 8,
    "total_verified": 30,
    "badges": [
      { "slug": "first_report", "awarded_at": "2025-01-01T10:00:00Z" }
    ],
    "department": null
  }
}
```

---

### `PATCH /profile/me`
**Auth required:** Yes (citizen only — admins managed by super_admin)

**Request Body (all optional):**
```json
{
  "name": "Rajan Kumar Mehta",
  "phone": "+919876543210"
}
```

**Logic:**
1. Validate: name min 2 chars, phone valid E.164 format if provided
2. Update `profiles` row where `id = auth.uid()`
3. Return updated profile

**Note:** `role`, `hero_score`, `department_id` are NOT updatable via this endpoint.

---

### `POST /profile/avatar`
**Auth required:** Yes

**Request:** `multipart/form-data` with `file` field (JPEG/PNG, max 5MB)

**Logic:**
1. Validate file type and size
2. Upload to Supabase Storage: `avatars/{user_id}/avatar.jpg`
3. Update `profiles.avatar_url`
4. Return new avatar URL

---

## Admin Management (Super Admin Only)

### `POST /admin/create-dept-admin`
**Auth required:** Yes, role = `super_admin`

**Request Body:**
```json
{
  "email": "roads.admin@city.gov",
  "name": "Suresh Kumar",
  "department_id": "uuid-of-roads-dept"
}
```

**Logic:**
1. Verify caller is `super_admin`
2. Create Supabase auth user (magic link invite via `supabase.auth.admin.inviteUserByEmail`)
3. Upsert `profiles` with `role = 'department_admin'` and `department_id`
4. Send magic link email for first login

---

### `PATCH /admin/toggle-user`
**Auth required:** Yes, role = `super_admin`

**Request Body:**
```json
{ "user_id": "uuid", "is_active": false }
```

**Logic:** Update `profiles.is_active`. Disabled users get `ACCOUNT_DISABLED` on next signin.

---

## Push Token Registration

### `POST /profile/push-token`
**Auth required:** Yes

**Request Body:**
```json
{
  "token": "ExponentPushToken[xxxxxx]",
  "platform": "android"
}
```

**Logic:**
1. Upsert into `push_tokens` (ON CONFLICT on `token`, update `user_id` and `updated_at`)
2. This handles device transfers (same token, new user)

---

## Session Management Rules
- Access token expiry: **1 hour** (Supabase default)
- Refresh token expiry: **30 days**
- Mobile app: store tokens in `expo-secure-store`
- Dashboard: store in httpOnly cookies via `@supabase/ssr`
- On 401 response: auto-refresh using refresh token; if refresh fails → redirect to login

---

## Role-Based Access Matrix

| Action | citizen | department_admin | super_admin |
|---|---|---|---|
| Sign up | ✅ | ❌ (invited) | ❌ (seeded) |
| View own profile | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ |
| View other profiles | ✅ (public fields only) | ✅ | ✅ |
| Create dept admin | ❌ | ❌ | ✅ |
| Disable user | ❌ | ❌ | ✅ |
| View all users | ❌ | ❌ | ✅ |

---

## Acceptance Criteria
- [ ] Citizen can sign up, receive JWT, and access protected endpoints
- [ ] Trigger auto-creates `profiles` row on every new auth user
- [ ] Invalid credentials return structured error (not 500)
- [ ] Disabled accounts cannot sign in
- [ ] Super admin can create department admin with correct role + department_id
- [ ] Push token upsert works; duplicate token updates correctly
- [ ] Avatar upload stores to correct path, updates `profiles.avatar_url`
- [ ] `PATCH /profile/me` cannot change role or hero_score
# PRD-03: Issue Reporting API

## Overview
The core reporting flow — citizens submit civic issues with images/video, location, and description. This PRD covers the full issue CRUD lifecycle from the client's perspective. AI processing (PRD-04) is triggered asynchronously after submission.

---

## Media Upload (Pre-step before issue creation)

### `POST /issues/upload-media`
**Auth required:** Yes (citizen)

Media must be uploaded BEFORE the issue is created. Returns storage URLs that get embedded in the issue.

**Request:** `multipart/form-data`
```
fields:
  files[]     — up to 5 images (JPEG/PNG/WEBP, max 10MB each) OR 1 video (MP4, max 50MB)
  issue_temp_id — client-generated UUID, used as folder name before issue exists
```

**Logic:**
1. Validate file count (max 5 images OR 1 video), MIME types, sizes
2. For each image: compress to max 1920px wide, convert to WEBP (reduces size ~60%)
3. Upload to Supabase Storage path: `issue-media/{user_id}/{temp_id}/{filename}`
4. Return array of storage paths

**Response:**
```json
{
  "success": true,
  "data": {
    "image_urls": [
      "issue-media/user123/temp456/img1.webp",
      "issue-media/user123/temp456/img2.webp"
    ],
    "video_url": null
  }
}
```

**Constraints:**
- Cannot mix images and video in same upload
- Images: max 5 files, max 10MB each
- Video: max 1 file, max 50MB, MP4 only
- Storage paths are NOT public URLs — clients request signed URLs separately

---

## Issue Creation

### `POST /issues`
**Auth required:** Yes (citizen)

**Request Body:**
```json
{
  "title": "Large pothole on MG Road near HDFC ATM",
  "description": "About 1 foot wide, causing vehicles to swerve. Has been here for 2 weeks.",
  "category": "pothole",
  "severity": "high",
  "latitude": 12.971598,
  "longitude": 77.594566,
  "address": "MG Road, Bangalore, Karnataka 560001",
  "ward": "Shivajinagar",
  "image_urls": ["issue-media/user123/temp456/img1.webp"],
  "video_url": null
}
```

**Validation Rules:**
| Field | Rule |
|---|---|
| `title` | Required, 5–100 chars |
| `description` | Optional, max 1000 chars |
| `category` | Required, must be valid `issue_category` enum value |
| `severity` | Required, must be valid `issue_severity` enum value |
| `latitude` | Required, -90 to 90 |
| `longitude` | Required, -180 to 180 |
| `image_urls` | Required, at least 1 image, must be valid Storage paths |
| `address` | Optional, max 300 chars |

**Logic:**
1. Validate all fields
2. Verify `image_urls` paths belong to `auth.uid()` (path starts with `issue-media/{user_id}/`)
3. Insert into `issues` table with `status = 'pending'` and `reporter_id = auth.uid()`
4. Insert `issue_updates` audit record: `{ type: 'status_change', new_status: 'pending' }`
5. Increment `profiles.total_reports` for reporter
6. **Asynchronously** invoke `process-issue` Edge Function (do not await)
7. Return created issue

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "issue-uuid",
    "status": "pending",
    "created_at": "2025-01-15T10:30:00Z",
    "message": "Issue submitted. AI is analyzing your report."
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `VALIDATION_ERROR` | Any field fails validation |
| `INVALID_MEDIA_PATH` | image_urls don't belong to user |
| `RATE_LIMITED` | More than 10 reports in 24h from same user |

**Rate Limiting:**
- Max 10 issue submissions per user per 24 hours
- Checked via count query: `SELECT count(*) FROM issues WHERE reporter_id = $uid AND created_at > now() - interval '24 hours'`

---

## Issue Retrieval

### `GET /issues`
**Auth required:** Yes

Paginated list of issues with filtering. Used by both mobile feed and dashboard.

**Query Parameters:**
```
page          int       default: 1
limit         int       default: 20, max: 100
status        string    filter by status (comma-separated: "pending,verified")
category      string    filter by category
severity      string    filter by severity
department_id uuid      filter by assigned department
reporter_id   uuid      filter by reporter (for "my issues")
lat           float     center lat for proximity filter
lng           float     center lng for proximity filter
radius_km     float     default: 5, max: 50 — proximity radius in km
sort          string    "newest" | "nearest" | "most_verified" | "severity"
              default: "newest"
search        string    full-text search on title
```

**Logic:**
1. Build query dynamically based on filters
2. For proximity filter: use PostGIS `ST_DWithin(location, ST_Point(lng, lat)::geography, radius_km * 1000)`
3. For text search: use `title ILIKE '%search%'` (or pg_trgm for better performance)
4. Exclude `deleted_at IS NOT NULL` rows
5. Department admins: automatically filter to their department's issues only (enforced server-side, not just RLS)
6. Return paginated results with signed URLs for images

**Response:**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": "uuid",
        "title": "Large pothole on MG Road",
        "category": "pothole",
        "severity": "high",
        "status": "verified",
        "latitude": 12.971598,
        "longitude": 77.594566,
        "address": "MG Road, Bangalore",
        "upvote_count": 12,
        "verification_count": 7,
        "image_urls": ["https://signed-url.supabase.co/..."],
        "ai_summary": "Large pothole approximately 30cm wide obstructing traffic.",
        "reporter": { "id": "uuid", "name": "Rajan M.", "avatar_url": "..." },
        "created_at": "2025-01-15T10:30:00Z",
        "has_verified": false   // whether the current user has verified this issue
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 143,
      "has_more": true
    }
  }
}
```

**Note on `has_verified`:** Checked against `verifications` table for `auth.uid()`. Shows upvote button state in mobile.

---

### `GET /issues/:id`
**Auth required:** Yes

Single issue with full detail, including status timeline.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "...",
    "description": "...",
    "category": "pothole",
    "severity": "high",
    "ai_category": "pothole",
    "ai_severity": "critical",
    "ai_summary": "Deep pothole causing traffic hazard.",
    "ai_confidence": 0.94,
    "status": "in_progress",
    "latitude": 12.971598,
    "longitude": 77.594566,
    "address": "...",
    "image_urls": ["https://signed-url..."],
    "video_url": null,
    "upvote_count": 18,
    "verification_count": 9,
    "reporter": { "id": "uuid", "name": "Rajan M.", "hero_score": 250 },
    "assigned_department": { "id": "uuid", "name": "Roads & Infrastructure" },
    "has_verified": true,
    "timeline": [
      { "type": "status_change", "new_status": "pending", "created_at": "..." },
      { "type": "ai_processed", "note": "AI categorized as pothole, severity: critical", "created_at": "..." },
      { "type": "verification_milestone", "note": "5 community verifications reached", "created_at": "..." },
      { "type": "department_assigned", "note": "Assigned to Roads & Infrastructure", "created_at": "..." },
      { "type": "status_change", "old_status": "assigned", "new_status": "in_progress", "created_at": "..." }
    ],
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### `GET /issues/nearby`
**Auth required:** Yes

Optimized proximity endpoint for map view. Returns lightweight markers only (no full descriptions).

**Query Parameters:**
```
lat       float   required
lng       float   required
radius_km float   default: 2, max: 20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "markers": [
      {
        "id": "uuid",
        "latitude": 12.971598,
        "longitude": 77.594566,
        "category": "pothole",
        "severity": "high",
        "status": "verified"
      }
    ]
  }
}
```

**Note:** Used by mobile map view — lightweight to avoid payload bloat on map pan/zoom.

---

## Issue Edit & Delete

### `PATCH /issues/:id`
**Auth required:** Yes, must be issue's reporter, status must be `pending`

Citizens can only edit their own issues while still in `pending` status (before AI processes).

**Request Body (all optional):**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "category": "road_damage",
  "severity": "critical"
}
```

**Logic:**
1. Verify `reporter_id = auth.uid()` and `status = 'pending'`
2. Update allowed fields only (not lat/lng, not image_urls — media is final)
3. Insert `issue_updates` audit record

---

### `DELETE /issues/:id`
**Auth required:** Yes

Soft delete only.

**Logic:**
1. Citizens: can only delete own issues in `pending` status
2. Super admin: can delete any issue
3. Set `deleted_at = now()`, insert `issue_updates` audit record
4. Media in Storage is NOT deleted immediately (cleanup job runs nightly)

---

## Signed URL Helper

### `POST /issues/signed-urls`
**Auth required:** Yes

Images are stored privately. Clients need signed URLs to display them.

**Request Body:**
```json
{ "paths": ["issue-media/user123/issue456/img1.webp"] }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "urls": {
      "issue-media/user123/issue456/img1.webp": "https://signed-url.supabase.co/...?token=...&expires=3600"
    }
  }
}
```

**Note:** Signed URLs expire in 1 hour. Lists endpoint pre-signs all image URLs before responding, so clients don't need to call this separately.

---

## Acceptance Criteria
- [ ] Issue created with at least 1 image
- [ ] Media path ownership validated (cannot reference another user's media)
- [ ] Rate limiting: 11th submission in 24h returns `RATE_LIMITED`
- [ ] Proximity query returns correct results using PostGIS
- [ ] `has_verified` flag is accurate per authenticated user
- [ ] Department admin list query is automatically scoped to their department
- [ ] Timeline includes all status changes in chronological order
- [ ] Edit is blocked if status is not `pending`
- [ ] Soft delete works; deleted issues don't appear in list queries
- [ ] Signed URLs returned for all image_urls in list and detail responses
# PRD-04: AI Processing Pipeline

## Overview
After an issue is submitted, a Supabase Edge Function calls Google Gemini 2.5 Flash Vision to automatically categorize the issue, estimate severity, generate a summary, detect duplicates, and route the issue to the correct department — all without human intervention.

---

## Trigger

The `process-issue` Edge Function is invoked in two ways:

1. **Async call from `POST /issues`** — fire-and-forget immediately after issue insert
2. **Webhook from Supabase Database** — `INSERT` on `issues` table (backup trigger, handles missed async calls)

```
Supabase DB Webhook:
  Table: issues
  Event: INSERT
  Function: process-issue
  Filter: status = 'pending'
```

---

## Edge Function: `process-issue`

### Input
```json
{ "issue_id": "uuid" }
```

### Full Processing Pipeline

```
Step 1: Fetch issue data
Step 2: Download image from Storage
Step 3: Call Gemini Vision API
Step 4: Parse AI response
Step 5: Duplicate detection (PostGIS query)
Step 6: Department routing
Step 7: Update issue record
Step 8: Create audit log entry
Step 9: Trigger notifications
```

---

### Step 1: Fetch Issue
```typescript
const { data: issue } = await supabase
  .from('issues')
  .select('*, reporter:profiles(id, name)')
  .eq('id', issue_id)
  .single();

// Guard: skip if already processed
if (issue.status !== 'pending') return;
```

---

### Step 2: Download Image
```typescript
// Download first image (primary analysis image)
const { data: imageData } = await supabase.storage
  .from('issue-media')
  .download(issue.image_urls[0]);

const base64Image = Buffer.from(await imageData.arrayBuffer()).toString('base64');
const mimeType = 'image/webp'; // we always convert to webp on upload
```

---

### Step 3: Gemini Vision Call

**Model:** `gemini-2.5-flash`
**API:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

**System Prompt:**
```
You are an AI assistant for a civic issue management platform. 
Analyze the provided image and the user's description to classify the civic issue.
Always respond with valid JSON only. No markdown, no explanation outside JSON.
```

**User Prompt:**
```
Analyze this civic issue report and respond with JSON only.

User's title: "${issue.title}"
User's description: "${issue.description}"
User's category: "${issue.category}"
User's severity: "${issue.severity}"

Respond with this exact JSON structure:
{
  "category": one of [pothole, road_damage, water_leak, sewage, streetlight, garbage, illegal_dumping, fallen_tree, park_damage, other],
  "severity": one of [low, medium, high, critical],
  "confidence": float between 0 and 1,
  "summary": "one sentence description of what you see, max 100 chars",
  "is_valid_civic_issue": true or false,
  "rejection_reason": "only if is_valid_civic_issue is false, explain why",
  "estimated_resolution_days": integer estimate of how long this typically takes to fix
}

Severity guide:
- critical: immediate safety hazard (deep pothole on highway, live wire, sewage overflow)
- high: significant inconvenience or growing hazard  
- medium: moderate issue, can wait a few days
- low: minor cosmetic issue
```

---

### Step 4: Parse AI Response

```typescript
const responseText = geminiResponse.candidates[0].content.parts[0].text;

let aiResult;
try {
  aiResult = JSON.parse(responseText);
} catch {
  // Gemini sometimes wraps in markdown — strip backticks
  const cleaned = responseText.replace(/```json|```/g, '').trim();
  aiResult = JSON.parse(cleaned);
}

// Validate required fields
const validCategories = ['pothole', 'road_damage', 'water_leak', ...];
const validSeverities = ['low', 'medium', 'high', 'critical'];

if (!validCategories.includes(aiResult.category)) aiResult.category = issue.category;
if (!validSeverities.includes(aiResult.severity)) aiResult.severity = issue.severity;
if (typeof aiResult.confidence !== 'number') aiResult.confidence = 0.5;
```

---

### Step 5: Duplicate Detection

Check for existing issues within 100 meters with same category, created in last 30 days.

```typescript
const { data: nearbyIssues } = await supabase.rpc('find_nearby_issues', {
  p_latitude: issue.latitude,
  p_longitude: issue.longitude,
  p_radius_meters: 100,
  p_category: aiResult.category,
  p_days_back: 30,
  p_exclude_id: issue.id
});

// SQL function:
// CREATE OR REPLACE FUNCTION find_nearby_issues(...)
// RETURNS TABLE(id uuid, title text, status issue_status) AS $$
//   SELECT id, title, status FROM issues
//   WHERE ST_DWithin(location, ST_Point(p_longitude, p_latitude)::geography, p_radius_meters)
//     AND category = p_category
//     AND created_at > now() - (p_days_back || ' days')::interval
//     AND id != p_exclude_id
//     AND deleted_at IS NULL
//     AND status != 'rejected'
//   ORDER BY created_at DESC LIMIT 1;
// $$ LANGUAGE SQL;

const isDuplicate = nearbyIssues && nearbyIssues.length > 0;
const duplicateOf = isDuplicate ? nearbyIssues[0].id : null;
```

**Duplicate handling:**
- If duplicate found AND original is `resolved`: still process (issue recurred)
- If duplicate found AND original is active: mark new issue as `rejected`, notify reporter with link to original

---

### Step 6: Department Routing

Map AI category → department slug:

```typescript
const CATEGORY_TO_DEPT: Record<string, string> = {
  pothole: 'roads',
  road_damage: 'roads',
  water_leak: 'water',
  sewage: 'water',
  streetlight: 'electricity',
  garbage: 'waste',
  illegal_dumping: 'waste',
  fallen_tree: 'parks',
  park_damage: 'parks',
  other: 'other'
};

const deptSlug = CATEGORY_TO_DEPT[aiResult.category] ?? 'other';

const { data: department } = await supabase
  .from('departments')
  .select('id')
  .eq('slug', deptSlug)
  .single();
```

---

### Step 7: Update Issue Record

```typescript
const newStatus = (() => {
  if (!aiResult.is_valid_civic_issue) return 'rejected';
  if (isDuplicate) return 'rejected';
  return 'ai_processed';
})();

await supabase.from('issues').update({
  ai_category: aiResult.category,
  ai_severity: aiResult.severity,
  ai_summary: aiResult.summary,
  ai_confidence: aiResult.confidence,
  ai_is_duplicate: isDuplicate,
  ai_duplicate_of: duplicateOf,
  ai_processed_at: new Date().toISOString(),
  status: newStatus,
  // Auto-assign department if valid
  assigned_department_id: newStatus === 'ai_processed' ? department.id : null,
  assigned_at: newStatus === 'ai_processed' ? new Date().toISOString() : null,
  // Use AI severity if confidence > 0.7, else keep user's severity
  severity: aiResult.confidence > 0.7 ? aiResult.severity : issue.severity,
  category: aiResult.confidence > 0.7 ? aiResult.category : issue.category,
}).eq('id', issue_id);
```

---

### Step 8: Audit Log

```typescript
await supabase.from('issue_updates').insert({
  issue_id: issue_id,
  updated_by: issue.reporter_id,  // system action on behalf of reporter
  type: 'ai_processed',
  new_status: newStatus,
  note: isDuplicate
    ? `AI detected duplicate of issue ${duplicateOf}`
    : `AI classified: ${aiResult.category}, severity: ${aiResult.severity}, confidence: ${(aiResult.confidence * 100).toFixed(0)}%`,
  metadata: {
    ai_category: aiResult.category,
    ai_severity: aiResult.severity,
    ai_confidence: aiResult.confidence,
    department_assigned: department?.id,
    is_duplicate: isDuplicate,
    duplicate_of: duplicateOf
  }
});
```

---

### Step 9: Notifications

```typescript
// Notify reporter of result
if (newStatus === 'rejected' && isDuplicate) {
  await sendNotification(issue.reporter_id, {
    type: 'issue_updated',
    title: 'Duplicate Issue Detected',
    body: `Your report is similar to an existing issue nearby. We've linked them together.`,
    issue_id: duplicateOf
  });
} else if (newStatus === 'ai_processed') {
  await sendNotification(issue.reporter_id, {
    type: 'issue_assigned',
    title: 'Issue Routed to Department',
    body: `Your ${aiResult.category} report has been assigned to ${department.name}.`,
    issue_id: issue_id
  });
}

// Notify department admins
const { data: deptAdmins } = await supabase
  .from('profiles')
  .select('id')
  .eq('department_id', department.id)
  .eq('role', 'department_admin');

for (const admin of deptAdmins) {
  await sendNotification(admin.id, {
    type: 'issue_assigned',
    title: 'New Issue Assigned',
    body: `New ${aiResult.severity} severity ${aiResult.category} reported in your area.`,
    issue_id: issue_id
  });
}
```

---

## Helper Edge Function: `send-notification`

Internal function called by other Edge Functions. Not publicly accessible.

```typescript
// Input
{
  user_id: string,
  type: notification_type,
  title: string,
  body: string,
  issue_id?: string
}

// Logic:
// 1. Insert into notifications table (in-app)
// 2. Fetch push tokens for user
// 3. Call Expo Push API: https://exp.host/--/api/v2/push/send
```

**Expo Push Payload:**
```json
{
  "to": "ExponentPushToken[...]",
  "title": "Issue Routed to Department",
  "body": "Your pothole report has been assigned to Roads & Infrastructure.",
  "data": { "issue_id": "uuid", "type": "issue_assigned" },
  "sound": "default"
}
```

---

## Error Handling & Retry

| Failure Scenario | Behavior |
|---|---|
| Gemini API timeout (>15s) | Retry once after 5s; if fails again, leave status `pending`, log error |
| Gemini returns invalid JSON | Strip markdown, retry parse; fallback to user's category/severity |
| Image download fails | Retry once; if fails, process with text only (no vision) |
| Duplicate detection query fails | Skip duplicate check, proceed with processing |
| Department not found | Default to 'other' department |
| Issue already processed | Early return, no-op |

**Retry Logic:**
```typescript
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2, delay = 5000): Promise<T> {
  for (let i = 0; i <= maxRetries; i++) {
    try { return await fn(); }
    catch (err) {
      if (i === maxRetries) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}
```

---

## Performance Targets
| Metric | Target |
|---|---|
| Total processing time | < 10 seconds |
| Gemini API call | < 8 seconds |
| Duplicate check | < 500ms |
| DB update + notification | < 1 second |

---

## Acceptance Criteria
- [ ] Valid civic issue: status changes `pending` → `ai_processed`, department auto-assigned
- [ ] Invalid civic issue (e.g., selfie): status = `rejected`, `ai_is_valid_civic_issue = false`
- [ ] Duplicate within 100m same category: status = `rejected`, `ai_duplicate_of` set
- [ ] Recurred issue (original resolved): NOT marked duplicate
- [ ] AI confidence > 0.7: overrides user's category/severity
- [ ] AI confidence ≤ 0.7: keeps user's category/severity
- [ ] Reporter notified of outcome in all cases
- [ ] Department admins notified of new assignment
- [ ] Gemini timeout: issue remains processable, doesn't get stuck
- [ ] Audit log entry created for every AI processing event
# PRD-05: Community Verification System

## Overview
Citizens can upvote/verify issues they witness in-person, adding credibility and urgency. Reaching the verification threshold (5 verifications) automatically upgrades the issue status. This drives community participation and helps filter out false reports.

---

## Business Rules

| Rule | Detail |
|---|---|
| One verification per user per issue | Enforced via DB UNIQUE constraint |
| Cannot verify own issue | Enforced in RLS + Edge Function |
| Cannot verify rejected issues | Enforced in Edge Function |
| Cannot verify resolved/closed issues | Enforced in Edge Function |
| Verification threshold | 5 verifications → status moves to `verified` |
| Verified issues get priority routing | Department dashboard shows verified issues at top |
| Unverify (remove vote) | Allowed anytime before issue is `in_progress` |

---

## Endpoints

### `POST /issues/:id/verify`
**Auth required:** Yes (citizen)

**Logic:**
1. Fetch issue — check it exists and is not deleted
2. Validate `status` is one of: `ai_processed`, `verified` — reject others with clear message
3. Check `reporter_id != auth.uid()` — cannot verify own issue
4. Check no existing verification row for `(issue_id, auth.uid())`
5. Insert into `verifications`
6. DB trigger handles:
   - `issues.verification_count++`
   - Status upgrade to `verified` if count reaches 5
   - `profiles.total_verified++` for the verifier
7. Award `+2` hero score to verifier (via `award-hero-score` helper)
8. If verification_count hits milestone (5, 10, 25, 50): insert `issue_updates` record of type `verification_milestone`
9. At exactly count = 5 (threshold): notify reporter

**Response:**
```json
{
  "success": true,
  "data": {
    "verification_count": 6,
    "has_verified": true,
    "status": "verified",
    "hero_points_earned": 2
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `ALREADY_VERIFIED` | User already verified this issue |
| `CANNOT_VERIFY_OWN` | Reporter trying to verify their own issue |
| `ISSUE_NOT_VERIFIABLE` | Status is pending / rejected / resolved / closed |
| `ISSUE_NOT_FOUND` | Issue doesn't exist or is deleted |

---

### `DELETE /issues/:id/verify`
**Auth required:** Yes (citizen)

Removes the user's verification (unverify/undo upvote).

**Logic:**
1. Fetch issue — check status is NOT `in_progress`, `resolved`, or `closed` (cannot unverify after dept acknowledges)
2. Delete row from `verifications` where `(issue_id, user_id) = (id, auth.uid())`
3. If no row found: return `NOT_VERIFIED` error
4. Decrement `issues.verification_count`
5. If count falls below 5 and status is `verified` → revert to `ai_processed`
6. Decrement `profiles.total_verified` for the user
7. Deduct `2` hero score (cannot go below 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "verification_count": 4,
    "has_verified": false,
    "status": "ai_processed"
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `NOT_VERIFIED` | User hasn't verified this issue |
| `CANNOT_UNVERIFY_AFTER_PROGRESS` | Status is in_progress or later |

---

### `GET /issues/:id/verifications`
**Auth required:** Yes

Returns who verified this issue (public info, not sensitive).

**Query Parameters:**
```
page    int   default: 1
limit   int   default: 20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "verifications": [
      {
        "user": { "id": "uuid", "name": "Priya S.", "avatar_url": "..." },
        "created_at": "2025-01-15T11:00:00Z"
      }
    ],
    "total": 7,
    "has_verified": true
  }
}
```

---

## Verification Milestone Notifications

Milestones that trigger events:

| Count | Event |
|---|---|
| 5 | Issue status → `verified`. Reporter notified: "5 citizens confirmed your issue!" |
| 10 | Insert milestone audit log. Reporter notified: "10 verifications!" |
| 25 | Insert milestone audit log. Reporter notified: "25 verifications — your issue is trending!" |
| 50 | Insert milestone audit log. Reporter notified: "50 verifications! This is a community priority." |

```typescript
async function checkAndFireMilestones(issueId: string, newCount: number, reporterId: string) {
  const milestones = [5, 10, 25, 50];
  if (!milestones.includes(newCount)) return;

  await supabase.from('issue_updates').insert({
    issue_id: issueId,
    updated_by: reporterId,
    type: 'verification_milestone',
    note: `${newCount} community verifications reached`,
    metadata: { count: newCount }
  });

  const messages: Record<number, string> = {
    5: '5 citizens confirmed your issue. It\'s now officially verified!',
    10: '10 verifications! Your issue is getting noticed.',
    25: '25 verifications — this issue is trending in your area.',
    50: '50 verifications! Your report has become a community priority.'
  };

  await sendNotification(reporterId, {
    type: 'verification_milestone',
    title: `${newCount} Verifications!`,
    body: messages[newCount],
    issue_id: issueId
  });
}
```

---

## Anti-Abuse Measures

### Rate Limiting on Verifications
- Max 20 verifications per user per hour (prevents bot-like voting)
- Checked via: `SELECT count(*) FROM verifications WHERE user_id = $uid AND created_at > now() - interval '1 hour'`

### Geographic Validation (Optional Enhancement)
- For issues where reporter provided location, verify that the verifying user's approximate location (from their IP or submitted location) is within 2km of the issue
- This is soft enforcement — show a warning on mobile, don't hard block
- Stored in `verifications.metadata` for analysis

### New Account Restriction
- Accounts created less than 24 hours ago cannot submit verifications
- Prevents spam accounts from manipulating verification counts

```typescript
const { data: profile } = await supabase.from('profiles').select('created_at').eq('id', auth.uid).single();
const accountAge = Date.now() - new Date(profile.created_at).getTime();
if (accountAge < 24 * 60 * 60 * 1000) {
  return error('ACCOUNT_TOO_NEW', 'You must have an account for 24 hours before verifying issues');
}
```

---

## DB Trigger (from PRD-01, restated here for clarity)

```sql
CREATE OR REPLACE FUNCTION on_verification_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment denormalized count
  UPDATE issues SET verification_count = verification_count + 1
  WHERE id = NEW.issue_id;

  -- Status upgrade at threshold
  UPDATE issues SET status = 'verified'
  WHERE id = NEW.issue_id
    AND status = 'ai_processed'
    AND verification_count >= 5;

  -- Increment verifier stats
  UPDATE profiles SET total_verified = total_verified + 1
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Acceptance Criteria
- [ ] Second verification from same user returns `ALREADY_VERIFIED`
- [ ] Reporter cannot verify their own issue
- [ ] 5th verification: issue status changes to `verified`, reporter notified
- [ ] Unverify works and decrements count correctly
- [ ] Unverify below threshold: status reverts to `ai_processed`
- [ ] Cannot unverify after status is `in_progress` or later
- [ ] Milestone notifications fire at 5, 10, 25, 50
- [ ] Rate limit: 21st verification in 1 hour is rejected
- [ ] Account < 24h old cannot verify
- [ ] Hero score +2 on verify, -2 on unverify (floor: 0)
# PRD-06: Issue Status & Lifecycle Management

## Overview
Defines the complete lifecycle of an issue from submission to closure, who can move it between states, the valid state transitions, and the audit trail. Department admins drive the middle/end lifecycle; the AI pipeline drives early transitions.

---

## Status State Machine

```
                    [AI rejected / duplicate]
         ┌─────────────────────────────────────────→ rejected
         │
pending ──→ ai_processed ──→ verified ──→ assigned ──→ in_progress ──→ resolved ──→ closed
                │                             ↑               │
                └─────────────────────────────┘               └──→ (auto-closed after 7 days)
              (auto-assign on AI process)
```

**Transition Table:**

| From | To | Who | Condition |
|---|---|---|---|
| `pending` | `ai_processed` | System (AI) | AI successfully processed |
| `pending` | `rejected` | System (AI) | Invalid issue or duplicate |
| `ai_processed` | `verified` | System (trigger) | 5+ verifications |
| `ai_processed` | `assigned` | Super Admin | Manual override |
| `verified` | `assigned` | Super Admin | Manual department change |
| `assigned` | `in_progress` | Department Admin | Dept acknowledges the issue |
| `in_progress` | `resolved` | Department Admin | Work complete |
| `resolved` | `closed` | System (cron) | Auto-close 7 days after resolution |
| `resolved` | `in_progress` | Department Admin | Reopened (issue recurred) |
| `any` | `rejected` | Super Admin | Spam/invalid override |

**Invalid Transitions** (return `INVALID_TRANSITION` error):
- Any backward transition not listed above
- Citizen changing any status
- Department admin moving outside their scope

---

## Endpoints

### `PATCH /issues/:id/status`
**Auth required:** Yes (department_admin or super_admin)

The primary status-change endpoint for department staff.

**Request Body:**
```json
{
  "status": "in_progress",
  "note": "Crew dispatched to location, expected completion by Friday."
}
```

**Logic:**
1. Fetch issue with current status and assigned department
2. Verify caller has permission for this transition (see matrix above)
3. Validate transition is legal per state machine
4. For department_admin: verify `issues.assigned_department_id = profile.department_id`
5. Update `issues.status` (and `resolved_at` if transitioning to `resolved`)
6. Insert `issue_updates` audit record
7. If `resolved`: update `profiles.total_resolved` for reporter, award hero score +25
8. Notify reporter of status change
9. If transitioning to `in_progress`: notify all verifiers (they cared enough to verify)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "issue-uuid",
    "status": "in_progress",
    "updated_at": "2025-01-16T09:00:00Z",
    "timeline_entry": {
      "type": "status_change",
      "old_status": "assigned",
      "new_status": "in_progress",
      "note": "Crew dispatched to location...",
      "created_at": "..."
    }
  }
}
```

**Error Cases:**
| Code | Trigger |
|---|---|
| `INVALID_TRANSITION` | Transition not allowed per state machine |
| `WRONG_DEPARTMENT` | Dept admin trying to update another dept's issue |
| `FORBIDDEN` | Citizen trying to change status |
| `NOTE_REQUIRED` | `rejected` transitions must include a note |

---

### `POST /issues/:id/notes`
**Auth required:** Yes (department_admin, super_admin)

Add a note/comment to an issue without changing status. Useful for progress updates.

**Request Body:**
```json
{
  "note": "Materials ordered, work begins Monday morning."
}
```

**Logic:**
1. Verify caller has access to this issue (dept admin → same dept)
2. Insert `issue_updates` with `type = 'note_added'`, no status fields
3. Notify reporter

**Response:**
```json
{
  "success": true,
  "data": {
    "update": {
      "id": "uuid",
      "type": "note_added",
      "note": "Materials ordered...",
      "updated_by": { "name": "Suresh Kumar", "role": "department_admin" },
      "created_at": "..."
    }
  }
}
```

---

### `PATCH /issues/:id/assign`
**Auth required:** Yes (super_admin only)

Manually reassign an issue to a different department.

**Request Body:**
```json
{
  "department_id": "uuid-of-new-dept",
  "note": "Rerouting to Water dept — the pothole has exposed a pipe."
}
```

**Logic:**
1. Verify caller is `super_admin`
2. Verify department exists and is active
3. Update `issues.assigned_department_id` and `assigned_at`
4. Update `issues.status` to `assigned` if it was `verified` or `ai_processed`
5. Insert audit record with `type = 'department_assigned'`
6. Notify new department's admins
7. Notify reporter of department change

---

### `GET /issues/:id/timeline`
**Auth required:** Yes

Returns the full ordered audit trail for an issue.

**Response:**
```json
{
  "success": true,
  "data": {
    "timeline": [
      {
        "id": "uuid",
        "type": "status_change",
        "old_status": null,
        "new_status": "pending",
        "note": null,
        "updated_by": { "id": "uuid", "name": "Rajan M.", "role": "citizen" },
        "metadata": {},
        "created_at": "2025-01-15T10:30:00Z"
      },
      {
        "id": "uuid",
        "type": "ai_processed",
        "note": "AI classified: pothole, severity: critical, confidence: 94%",
        "updated_by": { "name": "Community Hero AI", "role": "system" },
        "metadata": {
          "ai_category": "pothole",
          "ai_severity": "critical",
          "ai_confidence": 0.94,
          "department_assigned": "Roads & Infrastructure"
        },
        "created_at": "2025-01-15T10:30:15Z"
      },
      {
        "id": "uuid",
        "type": "verification_milestone",
        "note": "5 community verifications reached",
        "created_at": "2025-01-15T14:00:00Z"
      },
      {
        "id": "uuid",
        "type": "status_change",
        "old_status": "verified",
        "new_status": "in_progress",
        "note": "Crew dispatched to location, expected completion by Friday.",
        "updated_by": { "name": "Suresh Kumar", "role": "department_admin" },
        "created_at": "2025-01-16T09:00:00Z"
      }
    ]
  }
}
```

---

## Auto-Close Cron Job

**Function:** `auto-close-issues` (Supabase Edge Function via pg_cron)
**Schedule:** Daily at 02:00 UTC

```typescript
// Close issues resolved more than 7 days ago
const { data: toClose } = await supabase
  .from('issues')
  .select('id, reporter_id')
  .eq('status', 'resolved')
  .lt('resolved_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  .is('deleted_at', null);

for (const issue of toClose) {
  await supabase.from('issues').update({
    status: 'closed',
    updated_at: new Date().toISOString()
  }).eq('id', issue.id);

  await supabase.from('issue_updates').insert({
    issue_id: issue.id,
    updated_by: issue.reporter_id,
    type: 'status_change',
    old_status: 'resolved',
    new_status: 'closed',
    note: 'Issue automatically closed after 7 days.',
    metadata: { auto_closed: true }
  });
}
```

**pg_cron setup:**
```sql
SELECT cron.schedule('auto-close-issues', '0 2 * * *',
  $$SELECT net.http_post(url := 'https://<project>.functions.supabase.co/auto-close-issues',
    headers := '{"Authorization": "Bearer <service_role_key>"}') $$
);
```

---

## Status-Based Access Rules (summary)

| Status | Citizen | Dept Admin (assigned dept) | Super Admin |
|---|---|---|---|
| `pending` | Edit title/desc | — | Delete, reject |
| `ai_processed` | Verify | — | Assign, reject |
| `verified` | Unverify | → in_progress | Reassign, reject |
| `assigned` | — | → in_progress | Reassign |
| `in_progress` | — | Add note, → resolved | Reassign |
| `resolved` | — | → in_progress (reopen) | Reopen |
| `rejected` | — | — | Restore |
| `closed` | — | — | — |

---

## Acceptance Criteria
- [ ] Valid transition: status changes, audit record created, reporter notified
- [ ] Invalid transition: returns `INVALID_TRANSITION`, no DB changes made
- [ ] Dept admin cannot update issues assigned to another department
- [ ] `resolved` → `profiles.total_resolved++` for reporter
- [ ] `resolved` → reporter gets +25 hero score
- [ ] Auto-close cron changes `resolved` → `closed` after exactly 7 days
- [ ] Timeline endpoint returns entries in chronological order
- [ ] Note addition creates audit entry without changing status
- [ ] Super admin can reassign between departments; both depts get notified
- [ ] `rejected` transitions require a non-empty note
# PRD-07: Realtime & Push Notifications

## Overview
Citizens and department admins need live updates without polling. This PRD covers Supabase Realtime subscriptions (WebSocket-based) for the mobile app and dashboard, plus Expo Push Notifications for background alerts.

---

## Two Notification Channels

| Channel | Delivery | Use Case |
|---|---|---|
| **Supabase Realtime** | WebSocket, in-app | App is open — live feed updates, dashboard counts |
| **Expo Push** | FCM/APNs | App is backgrounded/closed — status change alerts |

Both channels are sent together for the same event. If the app is open, Realtime fires first (< 100ms); push arrives seconds later and is dismissed/handled by the app.

---

## Supabase Realtime Subscriptions

### Mobile App Subscriptions

**1. Own Issues Feed**
Subscribe to changes on the reporter's issues.
```typescript
supabase
  .channel('my-issues')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'issues',
    filter: `reporter_id=eq.${userId}`
  }, (payload) => {
    // payload.eventType: INSERT | UPDATE | DELETE
    // payload.new: updated issue row
    handleIssueUpdate(payload);
  })
  .subscribe();
```

**2. Issue Detail (when viewing a specific issue)**
```typescript
supabase
  .channel(`issue-${issueId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'issue_updates',
    filter: `issue_id=eq.${issueId}`
  }, (payload) => {
    appendToTimeline(payload.new);
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'issues',
    filter: `id=eq.${issueId}`
  }, (payload) => {
    updateIssueDetail(payload.new);
  })
  .subscribe();
```

**3. Notifications Bell**
```typescript
supabase
  .channel('my-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    incrementBellCount();
    showInAppToast(payload.new.title, payload.new.body);
  })
  .subscribe();
```

---

### Dashboard Subscriptions

**1. Issues Table (live count updates)**
```typescript
supabase
  .channel('dept-issues')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'issues',
    filter: `assigned_department_id=eq.${deptId}`
  }, (payload) => {
    refreshIssueList();
    updateStatusCounts();
  })
  .subscribe();
```

**2. Realtime Stats Widget**
```typescript
supabase
  .channel('dashboard-stats')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'issues'
  }, () => {
    invalidateStatsQuery(); // refetch aggregation
  })
  .subscribe();
```

---

## Notifications System

### In-App Notification Endpoints

#### `GET /notifications`
**Auth required:** Yes

**Query Parameters:**
```
page    int     default: 1
limit   int     default: 20
unread  boolean default: false (all) | true (unread only)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "issue_resolved",
        "title": "Issue Resolved!",
        "body": "Your pothole report on MG Road has been resolved.",
        "issue_id": "uuid",
        "read": false,
        "created_at": "2025-01-16T15:00:00Z"
      }
    ],
    "unread_count": 3,
    "pagination": { "page": 1, "limit": 20, "total": 8, "has_more": false }
  }
}
```

---

#### `PATCH /notifications/read`
**Auth required:** Yes

Mark specific notifications or all as read.

**Request Body:**
```json
{
  "notification_ids": ["uuid1", "uuid2"],  // specific IDs, OR:
  "all": true                               // mark all as read
}
```

**Logic:**
```typescript
if (body.all) {
  await supabase.from('notifications')
    .update({ read: true })
    .eq('user_id', auth.uid())
    .eq('read', false);
} else {
  await supabase.from('notifications')
    .update({ read: true })
    .in('id', body.notification_ids)
    .eq('user_id', auth.uid()); // ownership check
}
```

---

## Push Notification Flow

### When Push is Sent

| Event | Recipient | Title | Body |
|---|---|---|---|
| Issue AI processed | Reporter | "Issue Routed" | "Your [category] report was assigned to [dept]." |
| Issue verified (5 verifications) | Reporter | "5 Verifications!" | "Citizens confirmed your issue." |
| Issue status → in_progress | Reporter + Verifiers | "Work Started" | "The [dept] is now working on the issue." |
| Issue resolved | Reporter + Verifiers | "Issue Resolved!" | "Your reported [category] has been fixed." |
| New issue assigned | Dept Admins | "New Issue Assigned" | "New [severity] [category] in your area." |
| Milestone (10, 25, 50 verifications) | Reporter | "X Verifications!" | "Your issue is trending!" |
| Badge earned | User | "Badge Earned 🏅" | "You earned the [badge_name] badge!" |

---

### Push Delivery Edge Function: `send-push-notification`

Internal function, called by other Edge Functions.

```typescript
interface PushPayload {
  user_ids: string[];           // batch — can send to multiple users
  title: string;
  body: string;
  data?: Record<string, string>; // deep-link data
  issue_id?: string;
}

async function sendPushNotification(payload: PushPayload) {
  // 1. Fetch all push tokens for these user_ids
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token, user_id')
    .in('user_id', payload.user_ids);

  if (!tokens?.length) return;

  // 2. Build Expo push messages
  const messages = tokens.map(({ token }) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: {
      issue_id: payload.issue_id,
      ...payload.data
    },
    sound: 'default',
    priority: 'high'
  }));

  // 3. Send to Expo Push API (batch up to 100 per request)
  const chunks = chunkArray(messages, 100);
  for (const chunk of chunks) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chunk)
    });

    const result = await response.json();

    // 4. Handle invalid tokens (remove from DB)
    for (const ticket of result.data) {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        await supabase.from('push_tokens')
          .delete()
          .eq('token', ticket.to);
      }
    }
  }
}
```

---

### Also Insert In-App Notification
Push is always paired with an in-app `notifications` row:

```typescript
await supabase.from('notifications').insert(
  payload.user_ids.map(uid => ({
    user_id: uid,
    issue_id: payload.issue_id,
    type: payload.type,
    title: payload.title,
    body: payload.body
  }))
);
```

---

## Mobile App: Handling Received Push

```typescript
// In app/_layout.tsx (Expo)
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Handle tap on notification (app was background/closed)
Notifications.addNotificationResponseReceivedListener((response) => {
  const { issue_id } = response.notification.request.content.data;
  if (issue_id) {
    router.push(`/issue/${issue_id}`);  // deep link to issue
  }
});
```

---

## Notification Preferences (Future)

Store in `profiles.notification_preferences` (JSONB column — add in migration):
```json
{
  "push_on_status_change": true,
  "push_on_verification": true,
  "push_on_milestone": false
}
```

For MVP: all notifications on by default, no preference UI needed.

---

## Acceptance Criteria
- [ ] Realtime: status change in DB reflects on open mobile screen within 2 seconds
- [ ] Realtime: new issue_update entry appears in timeline without refresh
- [ ] Dashboard: new issue assignment appears in dept table without refresh
- [ ] Push: reporter receives push when issue moves to `in_progress`
- [ ] Push: dept admins receive push when new issue assigned to their dept
- [ ] Push tap navigates to correct issue detail screen
- [ ] Invalid/expired Expo tokens are removed from DB automatically
- [ ] `GET /notifications` returns correct unread count
- [ ] `PATCH /notifications/read` with `all: true` marks all as read
- [ ] In-app notifications inserted alongside every push send
- [ ] No duplicate notifications for same event (idempotency check)
# PRD-08: Gamification & Hero Score

## Overview
Hero Score and badges incentivize citizens to report accurately, verify honestly, and stay engaged. Every civic action earns points. Badges mark milestones. A leaderboard shows top contributors per city/ward.

---

## Hero Score Events

| Action | Points | Condition |
|---|---|---|
| Submit a report | +10 | On issue insert |
| Report verified by 5+ citizens | +15 | When issue hits `verified` status |
| Report resolved | +25 | When issue hits `resolved` status |
| Give a verification | +2 | On each verification insert |
| Remove a verification | -2 | On verification delete (floor: 0) |
| First report in a ward (today) | +20 | First issue in that ward for the calendar day |
| Badge earned | +0 (badges are the reward) | — |

**Floor:** Hero score cannot go below 0.

---

## Edge Function: `award-hero-score`

Internal helper called by other functions. Never called directly by clients.

```typescript
interface AwardInput {
  user_id: string;
  points: number;        // positive = add, negative = deduct
  reason: string;        // for logging
  issue_id?: string;     // context
}

async function awardHeroScore(input: AwardInput) {
  // Atomic increment using Postgres function to avoid race conditions
  await supabase.rpc('increment_hero_score', {
    p_user_id: input.user_id,
    p_points: input.points
  });

  // Check badge eligibility after every score change
  await checkAndAwardBadges(input.user_id);
}
```

```sql
-- Atomic increment, floor at 0
CREATE OR REPLACE FUNCTION increment_hero_score(p_user_id uuid, p_points integer)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET hero_score = GREATEST(0, hero_score + p_points)
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;
```

---

## Badge System

### Badge Definitions

| Badge Slug | Name | Criteria | Points Awarded |
|---|---|---|---|
| `first_report` | First Responder | Submit your first issue | Awarded once |
| `neighborhood_watch` | Neighborhood Watch | Submit 10 issues | Awarded once |
| `community_pillar` | Community Pillar | Give 50 verifications | Awarded once |
| `problem_solver` | Problem Solver | 5 of your reports get resolved | Awarded once |
| `speed_reporter` | Speed Reporter | Report within 1hr of an issue's first appearance (same location cluster) | Awarded once |
| `top_hero` | City Hero | Rank in top 10 on leaderboard at any point | Awarded once |
| `verified_reporter` | Verified Reporter | 3 of your reports reach `verified` status | Awarded once |
| `super_verifier` | Super Verifier | Give 10 verifications in a single day | Awarded once |

---

### Badge Award Logic

```typescript
async function checkAndAwardBadges(userId: string) {
  const [profile, existingBadges] = await Promise.all([
    supabase.from('profiles')
      .select('hero_score, total_reports, total_resolved, total_verified, created_at')
      .eq('id', userId)
      .single(),
    supabase.from('badges')
      .select('slug')
      .eq('user_id', userId)
  ]);

  const awarded = new Set(existingBadges.data?.map(b => b.slug));

  const toAward: string[] = [];

  // first_report
  if (!awarded.has('first_report') && profile.data.total_reports >= 1)
    toAward.push('first_report');

  // neighborhood_watch
  if (!awarded.has('neighborhood_watch') && profile.data.total_reports >= 10)
    toAward.push('neighborhood_watch');

  // community_pillar
  if (!awarded.has('community_pillar') && profile.data.total_verified >= 50)
    toAward.push('community_pillar');

  // problem_solver
  if (!awarded.has('problem_solver') && profile.data.total_resolved >= 5)
    toAward.push('problem_solver');

  // verified_reporter: count issues with status = verified or beyond
  if (!awarded.has('verified_reporter')) {
    const { count } = await supabase.from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', userId)
      .in('status', ['verified', 'assigned', 'in_progress', 'resolved', 'closed']);
    if ((count ?? 0) >= 3) toAward.push('verified_reporter');
  }

  // super_verifier: 10 verifications today
  if (!awarded.has('super_verifier')) {
    const { count } = await supabase.from('verifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString());
    if ((count ?? 0) >= 10) toAward.push('super_verifier');
  }

  if (toAward.length === 0) return;

  // Insert badges
  await supabase.from('badges').insert(
    toAward.map(slug => ({ user_id: userId, slug }))
  );

  // Notify for each badge
  for (const slug of toAward) {
    await sendNotification(userId, {
      type: 'badge_earned',
      title: 'Badge Earned! 🏅',
      body: `You earned the "${BADGE_NAMES[slug]}" badge!`,
    });
  }
}
```

---

## Leaderboard

### `GET /leaderboard`
**Auth required:** Yes

**Query Parameters:**
```
scope     string    "city" | "ward"     default: "city"
ward      string    required if scope = "ward"
period    string    "all_time" | "this_month" | "this_week"   default: "all_time"
limit     int       default: 10, max: 50
```

**Logic:**
- `all_time`: order by `profiles.hero_score DESC`
- `this_month` / `this_week`: requires a `hero_score_history` table or computed from events — for MVP, use `all_time` only
- Include the current user's rank even if not in top N (extra query)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "user": {
          "id": "uuid",
          "name": "Priya Sharma",
          "avatar_url": "...",
          "hero_score": 1240,
          "total_reports": 48,
          "total_resolved": 31,
          "badges": ["first_report", "neighborhood_watch", "problem_solver"]
        }
      },
      { "rank": 2, "user": { ... } }
    ],
    "my_rank": {
      "rank": 24,
      "hero_score": 180,
      "percentile": 85
    },
    "total_participants": 312
  }
}
```

**My rank query:**
```sql
SELECT rank FROM (
  SELECT id, RANK() OVER (ORDER BY hero_score DESC) as rank
  FROM profiles WHERE deleted_at IS NULL
) ranked WHERE id = $user_id;
```

---

### `GET /profile/:id/stats`
**Auth required:** Yes

Public profile stats for any user.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Rajan Mehta",
      "avatar_url": "...",
      "hero_score": 250,
      "total_reports": 12,
      "total_resolved": 8,
      "total_verified": 30,
      "rank": 24,
      "badges": [
        { "slug": "first_report", "name": "First Responder", "awarded_at": "..." },
        { "slug": "neighborhood_watch", "name": "Neighborhood Watch", "awarded_at": "..." }
      ],
      "recent_issues": [
        { "id": "uuid", "title": "...", "status": "resolved", "category": "pothole" }
      ],
      "member_since": "2025-01-01T00:00:00Z"
    }
  }
}
```

---

## Score Award Trigger Points (where in codebase each is called)

| Points | Called From | When |
|---|---|---|
| +10 | `POST /issues` handler | After successful insert |
| +15 | `PRD-06 status handler` | On transition to `verified` |
| +25 | `PRD-06 status handler` | On transition to `resolved` |
| +2 | `POST /issues/:id/verify` | After verification insert |
| -2 | `DELETE /issues/:id/verify` | After verification delete |
| +20 | `POST /issues` handler | If first in ward today (checked via query) |

```typescript
// First in ward check (in POST /issues)
const { count } = await supabase.from('issues')
  .select('id', { count: 'exact', head: true })
  .eq('ward', issue.ward)
  .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString())
  .neq('id', newIssue.id); // exclude the one just created

if (count === 0 && issue.ward) {
  await awardHeroScore({ user_id: userId, points: 20, reason: 'first_in_ward', issue_id: newIssue.id });
}
```

---

## Acceptance Criteria
- [ ] New issue → reporter gets +10 hero score immediately
- [ ] Issue reaches `verified` → reporter gets +15
- [ ] Issue reaches `resolved` → reporter gets +25
- [ ] Verification given → verifier gets +2
- [ ] Verification removed → verifier loses 2 (floor: 0)
- [ ] First issue in ward today → reporter gets +20 (only once per ward per day)
- [ ] `first_report` badge awarded on first issue submission
- [ ] `neighborhood_watch` badge awarded at 10 total reports
- [ ] Badge award fires push notification
- [ ] `top_hero` badge logic executes (daily cron or on leaderboard refresh)
- [ ] Leaderboard returns correctly ranked users with badge previews
- [ ] `my_rank` returns current user's position even when not in top 10
- [ ] Score increment is atomic (no race conditions under concurrent updates)
- [ ] Badges are idempotent — awarded at most once per user per slug
# PRD-09: Analytics & Predictive Insights

## Overview
The Next.js dashboard needs aggregated data for charts, KPI cards, heatmaps, and trend analysis. Department admins see their own data; super admins see everything. This PRD defines all analytics endpoints and the SQL queries powering them.

---

## Dashboard Overview Stats

### `GET /analytics/overview`
**Auth required:** Yes (department_admin or super_admin)

Returns KPI cards for the top of the dashboard.

**Query Parameters:**
```
department_id   uuid    (super_admin only — filter to one dept; default: all)
period          string  "7d" | "30d" | "90d"   default: "30d"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "30d",
    "kpis": {
      "total_issues": 342,
      "total_issues_delta": 12,          // vs previous period (% change)
      "resolved_issues": 198,
      "resolution_rate": 57.9,           // percentage
      "avg_resolution_hours": 38.4,      // hours from assigned → resolved
      "open_issues": 89,                 // pending + ai_processed + verified + assigned + in_progress
      "critical_open": 7,               // open issues with severity=critical
      "verified_rate": 68.4             // % of ai_processed that reached verified
    },
    "by_status": {
      "pending": 12,
      "ai_processed": 18,
      "verified": 23,
      "assigned": 15,
      "in_progress": 31,
      "resolved": 198,
      "rejected": 34,
      "closed": 11
    },
    "by_category": [
      { "category": "pothole", "count": 98, "resolved": 67 },
      { "category": "garbage", "count": 76, "resolved": 45 },
      { "category": "streetlight", "count": 54, "resolved": 38 }
    ],
    "by_severity": {
      "critical": 12,
      "high": 87,
      "medium": 156,
      "low": 87
    }
  }
}
```

**SQL for KPIs:**
```sql
-- Total issues in period
SELECT count(*) FROM issues
WHERE created_at >= now() - interval '30 days'
  AND deleted_at IS NULL
  AND (assigned_department_id = $dept_id OR $dept_id IS NULL);

-- Avg resolution time (assigned → resolved)
SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - assigned_at)) / 3600) as avg_hours
FROM issues
WHERE resolved_at IS NOT NULL
  AND assigned_at IS NOT NULL
  AND resolved_at >= now() - interval '30 days'
  AND deleted_at IS NULL;
```

---

## Time Series Data

### `GET /analytics/trends`
**Auth required:** Yes (department_admin or super_admin)

Daily/weekly counts for line charts.

**Query Parameters:**
```
department_id   uuid
period          "30d" | "90d" | "1y"   default: "30d"
granularity     "day" | "week"          default: "day" (week for 1y)
metric          "reported" | "resolved" | "verified"   default: "reported"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "series": [
      { "date": "2025-01-01", "count": 8 },
      { "date": "2025-01-02", "count": 12 },
      { "date": "2025-01-03", "count": 5 }
    ],
    "total": 342,
    "peak_day": { "date": "2025-01-14", "count": 24 }
  }
}
```

**SQL (reported issues per day):**
```sql
SELECT
  DATE_TRUNC('day', created_at) AS date,
  count(*) AS count
FROM issues
WHERE created_at >= now() - interval '30 days'
  AND deleted_at IS NULL
GROUP BY 1
ORDER BY 1;
```

---

## Heatmap Data

### `GET /analytics/heatmap`
**Auth required:** Yes

Returns geo-clustered issue locations for the map heatmap overlay.

**Query Parameters:**
```
department_id   uuid
status          string    comma-separated status values   default: all active
category        string    filter by category
period          "7d" | "30d" | "all"   default: "30d"
bounds          string    "lat_sw,lng_sw,lat_ne,lng_ne"  (map viewport bounds)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "points": [
      {
        "latitude": 12.971598,
        "longitude": 77.594566,
        "weight": 3,        // = verification_count + 1, used for heat intensity
        "category": "pothole",
        "severity": "high"
      }
    ],
    "total": 248
  }
}
```

**SQL (within viewport bounds):**
```sql
SELECT
  latitude, longitude,
  (verification_count + 1) as weight,
  category, severity
FROM issues
WHERE deleted_at IS NULL
  AND created_at >= now() - interval '30 days'
  AND latitude BETWEEN $lat_sw AND $lat_ne
  AND longitude BETWEEN $lng_sw AND $lng_ne
  AND ($category IS NULL OR category = $category)
LIMIT 1000;
```

---

## Department Performance

### `GET /analytics/departments`
**Auth required:** Yes (super_admin only)

Comparison table across all departments.

**Query Parameters:**
```
period    "7d" | "30d" | "90d"   default: "30d"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "departments": [
      {
        "id": "uuid",
        "name": "Roads & Infrastructure",
        "slug": "roads",
        "stats": {
          "total_assigned": 98,
          "resolved": 72,
          "in_progress": 15,
          "overdue": 8,              // in_progress for > 7 days
          "avg_resolution_hours": 42.1,
          "resolution_rate": 73.5
        }
      }
    ]
  }
}
```

**SQL:**
```sql
SELECT
  d.id, d.name, d.slug,
  count(i.id) FILTER (WHERE i.status NOT IN ('rejected', 'closed')) as total_assigned,
  count(i.id) FILTER (WHERE i.status = 'resolved') as resolved,
  count(i.id) FILTER (WHERE i.status = 'in_progress') as in_progress,
  count(i.id) FILTER (WHERE i.status = 'in_progress' AND i.assigned_at < now() - interval '7 days') as overdue,
  AVG(EXTRACT(EPOCH FROM (i.resolved_at - i.assigned_at)) / 3600)
    FILTER (WHERE i.resolved_at IS NOT NULL) as avg_resolution_hours
FROM departments d
LEFT JOIN issues i ON i.assigned_department_id = d.id
  AND i.created_at >= now() - interval '30 days'
  AND i.deleted_at IS NULL
GROUP BY d.id, d.name, d.slug
ORDER BY resolution_rate DESC;
```

---

## Predictive Insights

### `GET /analytics/predictions`
**Auth required:** Yes (department_admin or super_admin)

AI-powered insights on recurring patterns and maintenance needs.

**Response:**
```json
{
  "success": true,
  "data": {
    "hotspots": [
      {
        "area": "MG Road - Brigade Road Junction",
        "lat": 12.9716,
        "lng": 77.5946,
        "issue_count_30d": 12,
        "dominant_category": "pothole",
        "prediction": "High likelihood of recurring issues. Recommend infrastructure inspection.",
        "risk_score": 87
      }
    ],
    "recurring_locations": [
      {
        "lat": 12.968,
        "lng": 77.591,
        "issue_count": 8,
        "last_resolved": "2025-01-10",
        "category": "water_leak",
        "note": "Same location resolved 3 times in 90 days — underlying pipe damage likely."
      }
    ],
    "category_trends": [
      {
        "category": "pothole",
        "trend": "increasing",
        "change_pct": 34,
        "period_comparison": "this month vs last month"
      }
    ]
  }
}
```

**Hotspot detection SQL:**
```sql
-- Cluster issues within 200m radius using PostGIS
SELECT
  ST_Y(ST_Centroid(ST_Collect(location::geometry))) as lat,
  ST_X(ST_Centroid(ST_Collect(location::geometry))) as lng,
  count(*) as issue_count,
  MODE() WITHIN GROUP (ORDER BY category) as dominant_category,
  count(*) * 10 as risk_score   -- simplified scoring for MVP
FROM issues
WHERE created_at >= now() - interval '30 days'
  AND deleted_at IS NULL
  AND status != 'rejected'
GROUP BY ST_SnapToGrid(location::geometry, 0.002)  -- ~200m grid
HAVING count(*) >= 3
ORDER BY issue_count DESC
LIMIT 10;
```

**Recurring locations SQL:**
```sql
-- Same grid cell resolved multiple times
SELECT
  ST_Y(ST_Centroid(ST_Collect(location::geometry))) as lat,
  ST_X(ST_Centroid(ST_Collect(location::geometry))) as lng,
  count(*) as issue_count,
  MAX(resolved_at) as last_resolved,
  MODE() WITHIN GROUP (ORDER BY category) as category
FROM issues
WHERE status = 'resolved'
  AND resolved_at >= now() - interval '90 days'
  AND deleted_at IS NULL
GROUP BY ST_SnapToGrid(location::geometry, 0.002)
HAVING count(*) >= 3
ORDER BY issue_count DESC
LIMIT 10;
```

---

## Issue List for Dashboard (with advanced filters)

### `GET /analytics/issues-table`
**Auth required:** Yes (department_admin or super_admin)

Optimized for the dashboard data table — sortable, filterable, paginated.

**Query Parameters:**
```
page            int
limit           int       default: 25
status          string    comma-separated
category        string    comma-separated
severity        string    comma-separated
department_id   uuid
date_from       ISO date
date_to         ISO date
sort_by         "created_at" | "severity" | "verification_count" | "updated_at"
sort_order      "asc" | "desc"
search          string    searches title
```

**Response:**
```json
{
  "success": true,
  "data": {
    "issues": [
      {
        "id": "uuid",
        "title": "Large pothole on MG Road",
        "category": "pothole",
        "severity": "critical",
        "status": "in_progress",
        "verification_count": 14,
        "address": "MG Road, Bangalore",
        "reporter": { "name": "Rajan M." },
        "assigned_department": { "name": "Roads & Infrastructure" },
        "created_at": "...",
        "updated_at": "...",
        "days_open": 3
      }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 89, "has_more": true }
  }
}
```

**`days_open` computed field:**
```sql
EXTRACT(DAY FROM (COALESCE(resolved_at, now()) - created_at)) as days_open
```

---

## Caching Strategy

Analytics queries are expensive — cache results:

| Endpoint | Cache Duration | Cache Key |
|---|---|---|
| `/analytics/overview` | 5 minutes | `overview:{dept_id}:{period}` |
| `/analytics/trends` | 15 minutes | `trends:{dept_id}:{period}:{metric}` |
| `/analytics/heatmap` | 5 minutes | `heatmap:{bounds}:{period}` |
| `/analytics/departments` | 10 minutes | `departments:{period}` |
| `/analytics/predictions` | 60 minutes | `predictions:{dept_id}` |

**Implementation:** Use Supabase Edge Function in-memory cache (Map) or Redis if available. For MVP, 60-second in-memory cache is sufficient.

---

## Acceptance Criteria
- [ ] Overview KPIs match manual count queries (verified by testing)
- [ ] `total_issues_delta` correctly shows % change vs previous period
- [ ] Trends endpoint returns one data point per day for "30d" period (no gaps)
- [ ] Heatmap only returns issues within the requested viewport bounds
- [ ] Dept performance table ranks correctly by resolution rate
- [ ] Predictions hotspots show at least 3 issues per cluster
- [ ] Recurring locations show only areas with 3+ resolved issues in 90 days
- [ ] `issues-table` sort_by `severity` orders: critical → high → medium → low
- [ ] Department admin sees only their department's data (enforced server-side)
- [ ] Super admin sees all departments
- [ ] All queries complete in < 2 seconds under normal load
