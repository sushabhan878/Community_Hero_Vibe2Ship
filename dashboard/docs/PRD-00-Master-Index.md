# Community Hero AI — Dashboard PRD Master Index

## Project Overview
Community Hero AI is a hyperlocal civic issue management platform. This Next.js dashboard serves department admins and super admins to manage issues, view analytics, route work, and monitor community activity.

## Stack (Dashboard)
| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Supabase SSR Auth (@supabase/ssr) |
| Charts | Recharts (MVP) |
| Maps | Leaflet + react-leaflet |
| Realtime | Supabase Realtime (WebSocket) |
| HTTP Client | native fetch (server), supabase-js (client) |
| Linting | ESLint + next/core-web-vitals |
| Package Manager | pnpm |

## PRD Breakdown

| # | PRD | Scope | Priority |
|---|---|---|---|
| 01 | Dashboard Layout & Navigation | App shell, sidebar, routing, role-based views | P0 |
| 02 | Auth Integration | Supabase SSR auth, login page, middleware, role gating | P0 |
| 03 | Issue Management Table | Data table, filters, search, sorting, realtime updates | P0 |
| 04 | Issue Detail & Workflow | Detail view, timeline, status transitions, notes, media | P0 |
| 05 | Analytics Dashboards | KPI cards, trend charts, heatmap, department performance | P0 |
| 06 | Admin & User Management | User CRUD, department admin creation, RBAC UI | P1 |
| 07 | Leaderboard & Gamification | Leaderboard table, badge display, hero score | P2 |
| 08 | Notifications Center | Notification list, realtime bell, read/unread | P1 |

## Build Order (Hackathon Sequence)
```
Day 1 Morning:   PRD-01 (Layout) → PRD-02 (Auth)
Day 1 Afternoon: PRD-03 (Issue Table) → PRD-04 (Issue Detail)
Day 1 Evening:   PRD-05 (Analytics) → PRD-08 (Notifications)
Day 2 Morning:   PRD-06 (Admin Panel) → PRD-07 (Leaderboard)
Day 2 Afternoon: Polish, realtime subscriptions, edge cases
Day 2 Evening:   Final testing & deploy
```

## Shared Conventions (applies to all PRDs)

### Route Conventions
```
/dashboard                    → Overview / Analytics (role-based)
/dashboard/issues             → Issue management table
/dashboard/issues/[id]        → Issue detail & workflow
/dashboard/leaderboard        → Community leaderboard
/dashboard/notifications      → Notification center
/dashboard/admin/users        → User management (super_admin only)
/dashboard/admin/departments  → Department management (super_admin only)
```

### API Data Fetching Pattern
- **Server Components**: fetch directly from backend Edge Functions using `fetch()` + service role key
- **Client Components**: use `supabase-js` client with user's JWT
- **Realtime subscriptions**: client-side only, via Supabase Realtime channel
- **Error handling**: all data-fetching hooks return `{ data, error, loading }` tuple

### Component Naming
- Pages: `app/dashboard/<route>/page.tsx`
- Layouts: `app/dashboard/layout.tsx`
- Shared components: `@/components/<feature>/<Component>.tsx`
- UI primitives: `@/components/ui/<Primitive>.tsx`

### State Management
- Server state: React Server Components + search params for filters
- Client state: local `useState` / `useReducer` per page (no global store for MVP)
- Realtime state: Supabase channel subscriptions → local state merge
- Form state: native `form` + `useActionState` for server actions
