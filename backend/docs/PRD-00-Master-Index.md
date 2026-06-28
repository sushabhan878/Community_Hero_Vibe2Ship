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
