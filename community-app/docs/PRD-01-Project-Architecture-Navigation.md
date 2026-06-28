# PRD-01: Project Architecture & Navigation

## Overview
Set up the Expo 54 project structure, configure TypeScript, install core dependencies, establish file-based routing with Expo Router, and create the provider hierarchy.

---

## Dependencies

### Core
```json
{
  "expo": "~54.0.0",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo-router": "~4.0.0",
  "@supabase/supabase-js": "^2.49.0",
  "@react-navigation/native": "^7.0.0"
}
```

### State & Data
```json
{
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^5.0.0",
  "expo-secure-store": "~14.0.0",
  "@react-native-async-storage/async-storage": "^2.0.0"
}
```

### UI & Maps
```json
{
  "react-native-maps": "^1.20.0",
  "expo-image": "~2.0.0",
  "expo-image-picker": "~16.0.0",
  "expo-camera": "~16.0.0",
  "expo-location": "~18.0.0",
  "expo-notifications": "~0.30.0",
  "@expo/vector-icons": "^14.0.0",
  "react-native-safe-area-context": "^5.0.0",
  "react-native-gesture-handler": "^2.20.0",
  "react-native-reanimated": "^3.16.0",
  "date-fns": "^4.0.0"
}
```

### Dev
```json
{
  "typescript": "~5.6.0",
  "@types/react": "~19.0.0"
}
```

---

## Expo Router File Structure

```
app/
  _layout.tsx              # Root layout (providers, session check)
  (auth)/
    _layout.tsx            # Auth stack layout (no tabs)
    index.tsx              # Landing / onboarding carousel
    sign-in.tsx            # Sign-in screen
    sign-up.tsx            # Sign-up screen
  (tabs)/
    _layout.tsx            # Bottom tab navigator
    index.tsx              # Issue feed (list + map toggle)
    report.tsx             # Issue reporting flow
    notifications.tsx      # Notifications center
    profile.tsx            # Profile & settings
  issue/
    [id].tsx               # Issue detail screen
  admin/
    _layout.tsx            # Admin dashboard layout
    index.tsx              # Dashboard home (KPIs, charts)
    issues.tsx             # Issues management table
    leaderboard.tsx        # Leaderboard (shared route)
    settings.tsx           # Dept / system settings
  analytics/
    index.tsx              # Analytics overview
```

---

## Provider Hierarchy

```
<QueryClientProvider>          # React Query
  <SupabaseProvider>           # Supabase client singleton
    <AuthProvider>             # Session + profile state (Zustand)
      <ThemeProvider>          # Light/dark mode
      <LocationProvider>       # User's current location
      <NotificationProvider>   # Expo Notifications setup
        <GestureHandlerRootView>
          <Stack />            # Expo Router
        </GestureHandlerRootView>
      </NotificationProvider>
    </AuthProvider>
  </SupabaseProvider>
</QueryClientProvider>
```

---

## Navigation Flow

```
App Launch
  │
  ├─ Session stored? ──Valid?──▶ (tabs) Feed
  │       │               │
  │       No              No
  ▼                       │
  (auth) Onboarding       ▼
  │               (auth) Sign-in
  ▼
  Sign-in ──▶ (tabs) Feed
```

### Tab Navigator (Bottom Tabs)
| Tab | Icon | Screen |
|---|---|---|
| Feed | map / list | `(tabs)/index.tsx` |
| Report | add-circle | `(tabs)/report.tsx` |
| Notifications | notifications | `(tabs)/notifications.tsx` |
| Profile | person | `(tabs)/profile.tsx` |

### Deep Links (Push Notifications)
```
communityhero://issue/{id}  →  issue/[id].tsx
communityhero://profile/{id} →  profile tab
```

---

## Acceptance Criteria
- [ ] `npx expo start` launches without errors
- [ ] All tabs render and navigate correctly
- [ ] Session restore works (close app → reopen → still logged in)
- [ ] Deep links open correct screens
- [ ] Auth guard redirects unauthenticated users to `(auth)`
