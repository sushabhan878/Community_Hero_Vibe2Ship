# PRD-02: Auth Integration

## Overview
Handle authentication in the Next.js dashboard using Supabase SSR (`@supabase/ssr`). Only `department_admin` and `super_admin` roles can access the dashboard. Citizens use the mobile app only. The auth flow includes login, session management, middleware protection, role gating, and sign-out.

---

## Auth Flow

```
User → /dashboard/* → middleware checks session
                        ├─ No session → redirect to /login
                        └─ Has session → check role
                            ├─ citizen → redirect to /unauthorized (403 page)
                            └─ dept_admin / super_admin → render page
```

---

## Login Page (`/login`)

### Layout
- Full-screen centered card on gradient/dark background
- Brand logo + "Community Hero AI — Dashboard" heading
- Email + password inputs with validation
- "Sign In" button with loading state
- Error message area for invalid credentials
- No sign-up link (admins are invited only)

### Page Component: `app/(auth)/login/page.tsx`

```tsx
// Desired behavior
export default function LoginPage() {
  // 1. If already authenticated → redirect to /dashboard
  // 2. Render login form
  // 3. On submit: call supabase.auth.signInWithPassword()
  // 4. On success: router.push('/dashboard')
  // 5. On error: show inline error message
}
```

### Form Fields

| Field | Type | Validation |
|---|---|---|
| Email | email input | Required, valid email format |
| Password | password input | Required, min 1 char |

### States

| State | Behavior |
|---|---|
| Default | Empty form, "Sign In to Dashboard" heading |
| Loading | Button shows spinner, inputs disabled |
| Error | Red error banner below form with specific message (e.g., "Invalid email or password") |
| Success | Redirect to `/dashboard` |

### Edge Cases
- Already logged in user visits `/login` → redirect to `/dashboard`
- Disabled account → show "Account has been disabled. Contact your administrator."
- Network error → show "Unable to connect. Check your internet connection."

---

## Supabase SSR Client Setup

### Server Client (`lib/supabase/server.ts`)
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )
}
```

### Client Component Client (`lib/supabase/client.ts`)
```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Route Handler Client (`lib/supabase/middleware.ts`)
For refreshing sessions in middleware.

---

## Middleware (`middleware.ts`)

### Behaviour

```ts
// Path: middleware.ts
// Process every request to /dashboard/* and /login

export async function middleware(request: NextRequest) {
  // 1. Create Supabase client using request cookies
  // 2. Call supabase.auth.getUser() to verify session
  // 3. If no user and path starts with /dashboard → redirect to /login
  // 4. If user exists and path is /login → redirect to /dashboard
  // 5. If user exists but role is 'citizen' → redirect to /unauthorized
  // 6. Refresh session if needed
  // 7. Set response cookies
}
```

### Matcher Config
```ts
export const config = {
  matcher: ['/dashboard/:path*', '/login']
}
```

---

## Role Gating

### Server-Side Role Check (in layouts/pages)
```ts
// In app/dashboard/layout.tsx
async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, department_id')
    .eq('id', user?.id)
    .single()

  // Guard: citizen should never reach here (middleware catches it)
  if (!profile || profile.role === 'citizen') {
    redirect('/unauthorized')
  }

  return (
    <Shell role={profile.role} departmentId={profile.department_id}>
      {children}
    </Shell>
  )
}
```

### Per-Page Role Check
For admin-only pages (`/dashboard/admin/*`):
```ts
// In app/dashboard/admin/layout.tsx
if (profile.role !== 'super_admin') {
  redirect('/dashboard') // or notFound()
}
```

### Unauthorized Page (`/unauthorized`)
- Simple page: "You don't have access to this dashboard."
- "Contact your administrator if you need access."
- "Go to Home" link (if citizen, they have no home — but link to `/login`)

---

## Sign Out

### Flow
1. User clicks "Sign Out" in user menu dropdown
2. Confirmation dialog ("Are you sure you want to sign out?")
3. Call `supabase.auth.signOut()`
4. Clear client-side state (notifications, etc.)
5. Redirect to `/login`

---

## Session Management

| Property | Value |
|---|---|
| Access token expiry | 1 hour (Supabase default) |
| Refresh mechanism | `@supabase/ssr` auto-refreshes via middleware |
| Cookie storage | httpOnly cookies via `@supabase/ssr` |
| On 401 from API | Auto-refresh; if fails → redirect to `/login` |

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  (for server-side admin operations)
```

---

## Acceptance Criteria
- [ ] Login page renders without flash of authenticated content
- [ ] Valid credentials → redirect to `/dashboard`
- [ ] Invalid credentials → inline error, no redirect
- [ ] Disabled account → specific error message
- [ ] Already logged in → auto-redirect from `/login` to `/dashboard`
- [ ] Unauthenticated access to `/dashboard/*` → redirect to `/login`
- [ ] Citizen role accessing `/dashboard/*` → redirect to `/unauthorized`
- [ ] Non-admin user cannot access `/dashboard/admin/*`
- [ ] Sign out clears session and redirects to `/login`
- [ ] Session refresh works silently in middleware
- [ ] Middleware does not block static assets or Next.js internals
