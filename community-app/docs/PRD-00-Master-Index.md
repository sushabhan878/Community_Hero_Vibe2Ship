# Community Hero AI — Mobile App PRD Master Index

## Project Overview
Community Hero AI is a hyperlocal civic issue management platform. Citizens report potholes, water leaks, garbage, broken streetlights, and other civic problems via a mobile app. AI categorizes and routes them. Department admins resolve them. Community members verify them.

This document is the **mobile app frontend** PRD set. It mirrors the backend PRDs and covers all screens, components, navigation, state management, and client-side logic.

## Stack (Frontend)
| Layer | Technology |
|---|---|
| Framework | Expo 54 (React Native) |
| Language | TypeScript |
| Navigation | Expo Router (file-based routing) |
| Maps | react-native-maps (Apple Maps / Google Maps) |
| Camera | expo-image-picker / expo-camera |
| State | Zustand (global) + React Query (server state) |
| Storage | expo-secure-store (tokens), AsyncStorage (cache) |
| HTTP | supabase-js (client) |
| Realtime | Supabase Realtime (WebSocket via supabase-js) |
| Push | expo-notifications |
| Charts | react-native-chart-kit or victory-native |
| Auth | Supabase Auth (email, Google OAuth) |

## Screen Map

| # | Screen | Role | Priority |
|---|---|---|---|
| 01 | Onboarding / Auth | All | P0 |
| 02 | Issue Feed (List + Map) | All | P0 |
| 03 | Issue Detail & Timeline | All | P0 |
| 04 | Issue Reporting (Camera, Form) | Citizen | P0 |
| 05 | Profile & Settings | All | P1 |
| 06 | Notifications | All | P1 |
| 07 | Leaderboard | All | P2 |
| 08 | Department Dashboard | Dept Admin | P0 |
| 09 | Super Admin Dashboard | Super Admin | P1 |
| 10 | Analytics & Insights | All (view) / Dept Admin | P2 |

## Project Structure
```
community-app/
  app/                    # Expo Router pages
    (auth)/               # Onboarding, sign-in, sign-up
    (tabs)/               # Main tab navigator
      index.tsx           # Feed screen
      report.tsx          # Report issue screen
      notifications.tsx   # Notifications screen
      profile.tsx         # Profile screen
    issue/[id].tsx        # Issue detail screen
    leaderboard.tsx       # Leaderboard screen
    admin/                # Admin dashboard screens
    analytics/            # Analytics screens
  components/             # Shared UI components
  lib/                    # Utilities, API client, types
  hooks/                  # Custom hooks (useIssues, useNotifications, etc.)
  stores/                 # Zustand stores
  providers/              # Context providers (Auth, QueryClient, etc.)
  assets/                 # Images, fonts, icons
```

## Shared Conventions

### API Client
All backend calls go through a typed Supabase client created in `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

### Auth State
Session is stored in `expo-secure-store`. On app launch, restore session silently. If refresh fails → redirect to `(auth)`.

### Error Handling
- Network errors: show retry toast
- API errors (structured `{success, data, error}`): parse and show user-friendly message
- Form validation errors: inline field-level messages

### Loading States
- List screens: skeleton placeholders
- Detail screens: shimmer loading
- Actions: button-level loading spinner, disable during mutation

### Timestamp Display
All timestamps arrive as UTC ISO-8601 from backend. Convert to relative ("2h ago", "3d ago") using `date-fns`. Show absolute on long press / detail.

### Image Handling
- Images served via signed Supabase URLs (1hr expiry)
- Cache images locally with `expo-image` (disk cache)
- Upload flow: select → compress (max 1920px, WEBP) → upload to Storage → get path

## Build Order (Hackathon Sequence)
```
Day 1 Morning:   PRD-01 (Setup) → PRD-02 (Auth)
Day 1 Afternoon: PRD-03 (Reporting) → PRD-04 (Feed/Map)
Day 1 Evening:   PRD-05 (Detail/Timeline)
Day 2 Morning:   PRD-06 (Verification) → PRD-07 (Notifications)
Day 2 Afternoon: PRD-08 (Leaderboard) → PRD-09 (Admin Dashboard)
Day 2 Evening:   PRD-10 (Analytics) → Polish & Deploy
```

## Design System
- **Colors**: Primary green `#059669`, danger red `#DC2626`, warning amber `#D97706`, neutral gray scale
- **Typography**: System font (SF Pro on iOS, Roboto on Android)
- **Icons**: `@expo/vector-icons` (Ionicons / MaterialCommunityIcons)
- **Spacing**: 4px base unit (4, 8, 12, 16, 20, 24, 32)
