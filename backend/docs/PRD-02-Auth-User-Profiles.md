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
