# PRD-03: Issue Management Table

## Overview
The primary working view for department admins and super admins. A high-performance, filterable, sortable data table showing all civic issues. Supports realtime updates via Supabase Realtime so new issues appear without page refresh.

---

## Route
`/dashboard/issues`

---

## Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Issues                              [Export] [Bulk Action ▼] │
│                                                                │
│ [🔍 Search issues...     ]  [Filter ▼] [Sort ▼] [⟳ Refresh] │
│                                                                │
│  Active Filters: Status:open  Category:pothole  Severity:h ⓧ │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ ☐ │ Title           │ Status     │ Severity │ Dept  │ ⏱  │ │
│ │ ├──────────────────────────────────────────────────────────┤ │
│ │ ☐ │ Large pothole…  │ In Progress│ Critical │ Roads │ 3d  │ │
│ │ ☐ │ Water leak on…  │ Verified   │ High     │ Water │ 1d  │ │
│ │ ☐ │ Streetlight out…│ Assigned   │ Medium   │ Elec. │ 5d  │ │
│ │ …                                                          │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  Showing 1-25 of 342     ◀ 1 2 3 4 5 … 14 ▶                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Table

### Columns

| Column | Width | Sortable | Description |
|---|---|---|---|
| ☐ (Checkbox) | 40px | No | Row selection for bulk actions |
| ID | 80px | No | Truncated UUID (last 6 chars) |
| Title | 25% | Yes | Issue title with tooltip on hover |
| Category | 12% | Yes | Badge with category color |
| Severity | 10% | Yes | Color-coded pill (critical=red, high=orange, medium=yellow, low=gray) |
| Status | 12% | Yes | Badge with status color |
| Department | 14% | No | Assigned department name |
| Verification | 8% | Yes | Verification count + upvote icon |
| Reporter | 12% | No | Reporter name |
| Created | 10% | Yes | Relative time ("3 days ago") |
| Days Open | 8% | Yes | Days since creation / since assignment |

### Row States

| State | Visual |
|---|---|
| Default | White row, alternating subtle gray on hover |
| Selected | Blue left border + light blue background |
| Critical severity | Red left border accent |
| New (unread) | Bold title text, subtle pulse indicator |
| Loading | Skeleton rows (initial load) / shimmer on update |

### Empty State
- Illustration of a checklist with checkmark
- "No issues found" heading
- "Try adjusting your filters or check back later."
- "Clear Filters" button (visible only when filters are active)

---

## Filters

### Active Filter Bar
Shows all currently applied filters as removable chips:
```
Status: Open  ×  Category: Pothole  ×  Severity: High  ×  Clear All
```

### Filter Panel (Slide-over / Dropdown)

| Filter | Type | Options |
|---|---|---|
| Status | Multi-select checkboxes | pending, ai_processed, verified, assigned, in_progress, resolved, rejected, closed |
| Category | Multi-select | pothole, road_damage, water_leak, sewage, streetlight, garbage, illegal_dumping, fallen_tree, park_damage, other |
| Severity | Multi-select | critical, high, medium, low |
| Department | Dropdown (super_admin only) | All departments (default), or specific dept |
| Reporter | Text input | Search by reporter name |
| Date From / Date To | Date picker | Created date range |
| Ward | Text input | Civic ward name |

### Filter Logic
- All filters are AND-ed together
- Multi-select values within a filter are OR-ed
- Filters persist in URL search params: `/dashboard/issues?status=in_progress,verified&category=pothole`
- Deep-linkable: sharing a URL shares the filtered view

---

## Search

| Property | Value |
|---|---|
| Debounce | 300ms after user stops typing |
| Search Fields | `title` (ILIKE), `description` (ILIKE), `address` (ILIKE) |
| Min chars | 2 |
| Integration | Search param in API: `?search=pothole` |
| Clear | × button in search input, or Backspace when empty |

---

## Sorting

| Property | Value |
|---|---|
| Default sort | `created_at DESC` (newest first) |
| Click column header | Toggle ascending / descending |
| Active sort indicator | Arrow icon in column header |
| Multi-column sort | Not in MVP (single column only) |

**Sortable columns:** title, category, severity, status, verification_count, created_at, days_open

---

## Pagination

| Property | Value |
|---|---|
| Default page size | 25 |
| Options | 10, 25, 50, 100 |
| Total indicator | "Showing 1-25 of 342" |
| Navigation | ◀ 1 2 3 4 5 … 14 ▶ |
| Page size selector | Dropdown next to pagination |

---

## Realtime Updates

### Subscription

```typescript
// Subscribe to changes on issues assigned to this admin's department
const channel = supabase
  .channel('dept-issues-table')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'issues',
    filter: `assigned_department_id=eq.${departmentId}`
  }, (payload) => {
    // INSERT → prepend row (with new-row highlight animation)
    // UPDATE → update row in-place (with shimmer)
    // DELETE → remove row (with fade-out)
  })
  .subscribe()
```

### New Row Animation
- Newly inserted rows get a 2-second yellow highlight background that fades to white
- Updated rows get a brief shimmer effect

### Reconnection
- On Realtime disconnect: show a subtle banner "Live updates paused. Reconnecting…"
- On reconnect: full data refresh + dismiss banner

---

## Bulk Actions

| Action | Available When | Effect |
|---|---|---|
| Assign to Department | 1+ rows selected | Opens department picker modal; updates all selected |
| Change Status | 1+ rows selected | Opens status picker; validates transition per issue |
| Export CSV | 1+ rows selected (or all filtered) | Downloads CSV of current view |

### Bulk Action Bar
Appears at bottom when rows selected:
```
  3 issues selected  [Assign to Department ▼] [Change Status ▼] [Export] [Clear Selection]
```

---

## Data Fetching

### Server Component (initial load)
```tsx
// app/dashboard/issues/page.tsx
export default async function IssuesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; category?: string; severity?: string; search?: string; sort?: string; page?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams

  // Build query from URL params
  // Fetch from backend /analytics/issues-table endpoint
  // Pass initial data to client component
}
```

### Revalidation
- On mount: merge server data with realtime updates
- On filter/sort/page change: re-fetch from server (new URL)
- Manual refresh via "⟳ Refresh" button in toolbar

---

## Accessibility

- All filter controls have labels
- Sortable column headers are `<button>` elements
- Checkbox column uses native `<input type="checkbox">`
- Status and severity colors are accompanied by text labels
- Keyboard navigation: Tab through table cells, Enter to expand row details

---

## Acceptance Criteria
- [ ] Table renders 25 issues by default, sorted newest first
- [ ] Each filter updates URL search params and refetches data
- [ ] Multi-select filters (status, category) work correctly (OR within, AND across)
- [ ] Search debounces at 300ms and searches title/description
- [ ] Sort toggles asc/desc with visual indicator
- [ ] Pagination navigates correctly; page size change works
- [ ] Realtime: new issue appears in table within 2 seconds
- [ ] Realtime: updated issue row updates without full page refresh
- [ ] Bulk select checkboxes: select all, select individual, deselect all
- [ ] Bulk assign opens modal and updates selected issues
- [ ] CSV export includes current filter view
- [ ] Empty state renders when no issues match filters
- [ ] Department admin sees only their department's issues (enforced server-side)
- [ ] Super admin sees all issues with department filter available
