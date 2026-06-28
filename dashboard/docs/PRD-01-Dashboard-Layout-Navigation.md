# PRD-01: Dashboard Layout & Navigation

## Overview
The app shell that wraps all dashboard pages. Includes a responsive sidebar navigation, top bar with user menu and notification bell, and role-based view switching. Department admins and super admins see different navigation items and default home pages.

---

## Layout Structure

```
┌─────────────────────────────────────────────────┐
│  Top Bar                                         │
│  [logo] [breadcrumb]         [bell] [avatar ▼]   │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  Main Content Area                    │
│          │                                       │
│ 📊       │   <page content rendered here>        │
│   Overview│                                      │
│ 🚧       │                                      │
│   Issues │                                       │
│ 📈       │                                       │
│   Analytics                                      │
│ 🏆       │                                       │
│   Leaderboard│                                   │
│ 🔔       │                                       │
│   Notifications│                                 │
│          │                                       │
│ ⚙️ Admin │                                       │
│   Users  │                                       │
│   Departments│                                   │
└──────────┴──────────────────────────────────────┘
```

---

## Route Structure

```
app/
├── (auth)/                         ← login page group (no sidebar)
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── dashboard/                      ← protected layout group
│   ├── layout.tsx                  ← sidebar + topbar shell
│   ├── page.tsx                    ← overview / redirect based on role
│   ├── issues/
│   │   ├── page.tsx                ← issue table
│   │   └── [id]/
│   │       └── page.tsx            ← issue detail
│   ├── analytics/
│   │   └── page.tsx                ← charts, KPIs, heatmap
│   ├── leaderboard/
│   │   └── page.tsx                ← leaderboard table
│   ├── notifications/
│   │   └── page.tsx                ← notification center
│   └── admin/
│       ├── users/
│       │   └── page.tsx            ← user management (super_admin)
│       └── departments/
│           └── page.tsx            ← department management (super_admin)
```

---

## Sidebar Navigation

### Navigation Items (role-dependent)

| Label | Icon | Route | citizen | department_admin | super_admin |
|---|---|---|---|---|---|
| Overview | 📊 | `/dashboard` | ❌ | ✅ | ✅ |
| Issues | 🚧 | `/dashboard/issues` | ❌ | ✅ | ✅ |
| Analytics | 📈 | `/dashboard/analytics` | ❌ | ✅ | ✅ |
| Leaderboard | 🏆 | `/dashboard/leaderboard` | ❌ | ✅ | ✅ |
| Notifications | 🔔 | `/dashboard/notifications` | ❌ | ✅ | ✅ |
| Users | 👥 | `/dashboard/admin/users` | ❌ | ❌ | ✅ |
| Departments | 🏛️ | `/dashboard/admin/depts` | ❌ | ❌ | ✅ |

### Sidebar Behavior

**Desktop (≥768px):**
- Persistent sidebar, 260px wide
- Active route highlighted with primary color
- Collapsible to icon-only mode (64px) via hamburger toggle
- Admin section visually separated with a divider and "Admin" label

**Mobile (<768px):**
- Hidden by default
- Slide-over drawer triggered by hamburger icon in top bar
- Backdrop overlay when open (click to close)
- Same items as desktop

### Sidebar Component Structure

```
components/layout/
├── sidebar.tsx          ← sidebar container
├── sidebar-item.tsx     ← individual nav link
├── sidebar-admin-section.tsx  ← admin-only section
├── topbar.tsx           ← top bar with user menu + bell
└── user-menu.tsx        ← avatar dropdown (profile, settings, sign out)
```

---

## Top Bar

```
┌──────────────────────────────────────────────────────────────┐
│ [☰]  Community Hero AI    >    Issues    >    Detail        │
│                                    [🔔 3]  [👤 Admin ▼]     │
└──────────────────────────────────────────────────────────────┘
```

### Elements

| Element | Description |
|---|---|
| Hamburger (mobile) | Toggles mobile sidebar drawer |
| Breadcrumb | Auto-generated from route segments: `Dashboard > Issues > [title]` |
| Search (optional) | Global search bar (future enhancement) |
| Notification Bell | Icon with unread count badge; click → dropdown preview or navigate to `/dashboard/notifications` |
| User Avatar | Profile image + name dropdown with: View Profile, Settings, Sign Out |

---

## Role-Based Home Page

When a user visits `/dashboard`, the page redirects based on role:

| Role | Redirect to |
|---|---|
| `department_admin` | `/dashboard` (Overview analytics) |
| `super_admin` | `/dashboard` (Overview analytics, all depts) |

### Overview Page (Default Landing)

The overview page shows role-appropriate KPIs:

**Department Admin:**
- Issues assigned to my department (by status)
- My department's resolution rate
- Critical open issues (my department)
- Recent activity feed (new issues, status changes)

**Super Admin:**
- City-wide KPIs (total issues, resolved, avg resolution time)
- Cross-department comparison table
- System-wide alerts (departments falling behind)
- Trending categories city-wide

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | < 640px | Sidebar hidden (drawer), stacked content |
| Tablet | 640–1023px | Sidebar icon-only, content fills rest |
| Desktop | ≥ 1024px | Full sidebar + content |

---

## Theme & Dark Mode

- Light mode by default (system preference detection)
- Theme toggle in user menu dropdown
- Uses Tailwind CSS dark mode classes (`dark:` prefix)
- Dashboard-specific CSS variables in `globals.css`

---

## Loading & Error States

### Loading State
- Sidebar and topbar render immediately (static shell)
- Content area shows a skeleton loader matching page layout
- Route transitions use Next.js `loading.tsx` files per segment

### Error State
- Route segments have `error.tsx` files with:
  - Friendly error message
  - "Try again" button (calls `reset()`)
  - "Go to Dashboard" link
- Global error boundary at `dashboard/error.tsx` for uncaught errors

### Empty State
- Tables: "No issues found" with illustration and clear-filters CTA
- Charts: "Not enough data yet" placeholder
- Notifications: "All caught up!" with illustration

---

## Acceptance Criteria
- [ ] Sidebar renders correct nav items per role (super_admin sees admin section)
- [ ] Mobile sidebar drawer opens/closes correctly with backdrop
- [ ] Desktop sidebar collapses to icon-only mode
- [ ] Breadcrumb auto-generates from current route
- [ ] Notification bell shows unread count from server
- [ ] User menu dropdown shows profile info and sign out
- [ ] Role-based redirect on `/dashboard` works correctly
- [ ] Dashboard is responsive at all three breakpoints
- [ ] Loading skeletons appear during page transitions
- [ ] Error boundaries catch and display errors without breaking shell
