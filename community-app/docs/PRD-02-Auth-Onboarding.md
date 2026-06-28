# PRD-02: Authentication & Onboarding

## Overview
Handle user onboarding (carousel), sign-up, sign-in, password reset, and session management. Citizens sign up via email/password or Google OAuth. Admins are invited via magic link.

---

## Screens

### 1. Onboarding Carousel (`(auth)/index.tsx`)
**Purpose:** First-launch experience. Show 3-4 slides explaining the app value proposition.

**Slides:**
1. "Report Issues" — Snap a photo, describe the problem
2. "AI Processes" — Smart categorization and routing
3. "Community Verifies" — Neighbors upvote confirmed issues
4. "City Fixes" — Department track and resolve

**Behavior:**
- Swipeable horizontal pager
- Dot indicators at bottom
- "Skip" button top-right (saves `onboarding_complete: true` in AsyncStorage)
- "Get Started" on last slide → navigates to sign-up
- After first completion, skip carousel on subsequent launches

---

### 2. Sign-Up (`(auth)/sign-up.tsx`)

**Form Fields:**
| Field | Type | Validation |
|---|---|---|
| Name | TextInput | Required, min 2 chars |
| Email | TextInput (email) | Required, valid email format |
| Password | TextInput (secure) | Required, min 8 chars |
| Phone | TextInput (phone) | Optional, E.164 format |
| Sign Up | Button | |

**Flow:**
1. User fills form, taps "Sign Up"
2. Validate locally first (inline errors)
3. Call `POST /auth/signup` via Edge Function
4. On success: store session in `expo-secure-store`, navigate to `(tabs)`
5. On error: show toast with error message (EMAIL_TAKEN, WEAK_PASSWORD, etc.)

**Edge Cases:**
- Network timeout: retry button
- Email already taken: suggest sign-in instead
- Weak password: show requirements checklist

---

### 3. Sign-In (`(auth)/sign-in.tsx`)

**Form Fields:**
| Field | Type | Validation |
|---|---|---|
| Email | TextInput (email) | Required |
| Password | TextInput (secure) | Required |
| Sign In | Button | |
| Forgot Password? | Link | |

**Flow:**
1. User fills form, taps "Sign In"
2. Call Supabase Auth `signInWithPassword`
3. On success: fetch profile, store session, navigate to `(tabs)`
4. On error: show toast (INVALID_CREDENTIALS, ACCOUNT_DISABLED)

**Google OAuth:**
- "Continue with Google" button below form
- Calls `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Handles redirect back via deep link

**Magic Link (Admins):**
- "Email a magic link" option
- Calls `supabase.auth.signInWithOtp({ email })`
- Shows confirmation message: "Check your email"

---

### 4. Profile (`(tabs)/profile.tsx`)

**Header Section:**
- Avatar (editable — tap to change via `expo-image-picker`)
- Name
- Hero score with rank badge
- Role badge ("Citizen" / "Dept Admin" / "Super Admin")

**Stats Cards:**
| Metric | Source |
|---|---|
| Total Reports | `profile.total_reports` |
| Issues Resolved | `profile.total_resolved` |
| Verifications Given | `profile.total_verified` |
| Hero Score | `profile.hero_score` |

**Actions:**
- Edit Profile (name, phone)
- View Badges (list of earned badges)
- Settings: Notification preferences, App version, Logout
- Logout: clear session + secure store, navigate to `(auth)`

**Edit Profile Modal:**
- Name (TextInput, min 2 chars)
- Phone (TextInput, E.164 optional)
- Avatar upload: image-picker → compress → upload to Storage → update profile

---

## Session Management

```
App Launch
  ├─ expo-secure-store.getItem('session')?
  │   ├─ Yes → restoreSession()
  │   │   ├─ Success → fetch profile → (tabs)
  │   │   └─ Fail (expired) → refreshSession()
  │   │       ├─ Success → (tabs)
  │   │       └─ Fail → (auth)
  │   └─ No → (auth)
  │
  └─ On every 401 response from API:
      └─ Auto-refresh; if fails → logout → (auth)
```

---

## Acceptance Criteria
- [ ] Onboarding shows on first launch only
- [ ] Sign-up creates account and navigates to feed
- [ ] Sign-in restores session and navigates to feed
- [ ] Google OAuth works (returns from browser to app)
- [ ] Profile displays correct stats from backend
- [ ] Avatar upload works (compress → upload → display)
- [ ] Logout clears all local state and returns to auth
- [ ] Token refresh works silently on expiry
- [ ] Disabled account shows appropriate error on sign-in
