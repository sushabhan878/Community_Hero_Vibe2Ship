# PRD-04: Issue Feed & Map View

## Overview
The home screen of the app — a dual-mode view (list / map) showing all civic issues near the user. Supports filtering, sorting, and search. Realtime updates as new issues are reported.

---

## Screen: Feed (`(tabs)/index.tsx`)

### Mode Toggle
- Segmented control at top: **List** | **Map**
- Default: List
- Persist preference in AsyncStorage

---

### Mode 1: List View

**Components:**
- Search bar at top (full-text search on title)
- Filter chips row below (horizontal scroll):
  - All (default), Pending, Verified, In Progress, Resolved
  - Category filter (bottom sheet on tap)
  - Severity filter
- Sort dropdown: Newest | Nearest | Most Verified | Highest Severity
- FlatList of issue cards

**Issue Card Component:**
```
┌─────────────────────────────────┐
│ [Image]  Title (2 lines max)    │
│          Category • Severity    │
│          Address (1 line)       │
│          ⏰ 2h ago  ✅ 5 verif  │
│          Status badge           │
└─────────────────────────────────┘
```

**Card Behaviors:**
- Tap → navigate to `issue/[id]`
- Image carousel if multiple images (horizontal swipe within card)
- Distance from user shown if location permission granted
- Pull-to-refresh (refetch first page)
- Infinite scroll (paginated, page size 20)

**Empty State:**
- Illustration + "No issues found in your area"
- "Be the first to report one!" CTA → navigate to report screen

---

### Mode 2: Map View

**Components:**
- Full-screen map (react-native-maps)
- Clustered markers (for performance with many issues)
- Marker color by severity:
  - Low: green
  - Medium: amber
  - High: orange
  - Critical: red
  - Resolved: gray
- Marker tap → callout with title + status + thumbnail

**Map Behavior:**
- Center on user's location on mount
- Fetch markers for visible map region (bounds-based query)
- Re-fetch on pan/zoom (debounced 500ms)
- Cluster tap → zoom in to show individual markers
- Callout tap → navigate to issue detail

**Callout Component:**
```
┌──────────────────────┐
│ [Small thumbnail]    │
│ Title (1 line)       │
│ Category • Severity  │
│ Status badge         │
└──────────────────────┘
```

---

### Filters Bottom Sheet

**Categories (multi-select checkboxes):**
- All (default), Pothole, Road Damage, Water Leak, Sewage, Streetlight, Garbage, Illegal Dumping, Fallen Tree, Park Damage, Other

**Status (single-select):**
- All, Pending, AI Processed, Verified, In Progress, Resolved, Rejected

**Severity (multi-select):**
- All, Low, Medium, High, Critical

**Actions:**
- Apply → refetch with filters
- Reset → clear all filters
- Active filter count badge on filter button

---

### Search

- Debounced (300ms) full-text search on issue titles
- Search scope: current filters + text query
- Show recent searches (stored locally, max 5)
- Clear button in search input

---

## API Integration

### Feed Query (`GET /issues`)
```typescript
const { data } = await supabase.functions.invoke('issues', {
  method: 'GET',
  query: {
    page,
    limit: 20,
    status: filters.status?.join(','),
    category: filters.category,
    severity: filters.severity,
    lat: userLocation?.latitude,
    lng: userLocation?.longitude,
    radius_km: 10,
    sort: sortBy,
    search: searchQuery,
  },
})
```

### Nearby Markers (`GET /issues/nearby`)
```typescript
const { data } = await supabase.functions.invoke('issues/nearby', {
  method: 'GET',
  query: {
    lat: region.latitude,
    lng: region.longitude,
    radius_km: 2,
  },
})
```

---

## Realtime Updates

**Subscriptions:**
- `issues` table: listen for INSERT and UPDATE
- On new issue in current area → insert into list (top) and add marker
- On status change → update card/marker in-place
- Animate new items with fade-in

---

## Location Permissions

**States:**
| State | Behavior |
|---|---|
| Granted | Center map on user, show distance badges |
| Denied | Show default city center, manual location entry option |
| Not asked | Prompt on first mount with explanation |

---

## Acceptance Criteria
- [ ] List view loads first page on mount
- [ ] Infinite scroll loads next pages
- [ ] Map view shows markers within visible bounds
- [ ] Markers update on map pan/zoom (debounced)
- [ ] Filter changes trigger refetch
- [ ] Search works with debounce
- [ ] Cards show correct status badge colors
- [ ] Realtime: new issue appears without manual refresh
- [ ] Pull-to-refresh reloads first page
- [ ] Empty state shown when no issues in area
