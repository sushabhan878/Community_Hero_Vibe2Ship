# PRD-08: Notifications Center

## Overview
In-app notification center for department admins and super admins. Shows all system notifications — new issue assignments, status changes, milestones, and badge events. Supports realtime updates via Supabase Realtime so new notifications appear instantly.

---

## Route
`/dashboard/notifications`

---

## Notification Bell (Global, in Top Bar)

### Component: `NotificationBell`

```
 [🔔 3]  ← Top bar, always visible
```

### Behavior

| Action | Behavior |
|---|---|
| Unread count | Badge with number of unread notifications |
| Click bell | Dropdown shows last 5 unread notifications + "View All" link |
| Click "View All" | Navigate to `/dashboard/notifications` |
| Click individual notification | Mark as read + navigate to relevant issue (if linked) |
| Real-time update | New notification appears in bell count + dropdown toast |

### Dropdown Preview

```
┌──────────────────────────────────┐
│ Notifications                    │
│                                  │
│ ● New issue assigned to Roads    │
│   Roads & Infrastructure · 2m ago│
│ ● Issue resolved: Pothole on…   │
│   Roads · 15m ago                │
│ ● Anika Patel reached milestone  │
│   Community · 1h ago             │
│                                  │
│ ──────────────────────────────   │
│          View All Notifications → │
└──────────────────────────────────┘
```

### Toast on New Notification
When a Realtime event fires:
- Mobile: banner slides in from top
- Desktop: toast slides in from bottom-right
- Auto-dismisses after 5 seconds
- Click → navigate to relevant issue

---

## Notifications Center Page

### Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Notifications                          [Mark All as Read]     │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 🟢 Today                                                    │ │
│ │                                                            │ │
│ │ ● New issue assigned to Roads & Infrastructure             │ │
│ │   "Large pothole on MG Road" — 2 minutes ago             │ │
│ │                                                            │ │
│ │ ○ Issue resolved: Water leak in JP Nagar                   │ │
│ │   "Water leak at 3rd Main" — 1 hour ago                  │ │
│ │                                                            │ │
│ │ ───────────────────────────────────────────────────────     │ │
│ │ 🟡 Yesterday                                                │ │
│ │                                                            │ │
│ │ ○ Priya Sharma verified an issue                           │ │
│ │   "Streetlight out on 5th Cross" — 1 day ago             │ │
│ │                                                            │ │
│ │ ○ Anika Patel earned "Neighborhood Watch" badge            │ │
│ │   — 1 day ago                                              │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│                       Load More ↓                              │
└──────────────────────────────────────────────────────────────────┘
```

### Sections Grouped by Date

| Section | Examples |
|---|---|
| 🟢 Today | Anything from today |
| 🟡 Yesterday | Anything from yesterday |
| 🗓️ This Week | 2-7 days ago |
| 🗓️ Earlier | > 7 days ago |

### Notification Item Layout

```
[●/○] [Icon] [Title]
       [Body/Detail]
       [Time ago]  [View Issue →]
```

- ● = unread (bold text, blue left border)
- ○ = read (normal text, no border)

### Notification Types

| Type | Icon | Title | Body |
|---|---|---|---|
| `issue_assigned` | 🚧 | New Issue Assigned | "New [severity] [category] reported in your area" |
| `issue_verified` | 👍 | Issue Verified | "5 citizens confirmed the issue on [title]" |
| `issue_updated` | 🔄 | Issue Updated | "[Department] updated [title]" |
| `issue_resolved` | ✅ | Issue Resolved | "[title] has been resolved!" |
| `verification_milestone` | 🎯 | Milestone Reached | "[N] verifications on [title]" |
| `badge_earned` | 🏅 | Badge Earned | "[User] earned the [badge_name] badge!" |

### Empty State
- Bell icon with checkmark
- "All caught up!"
- "You have no notifications at this time."

---

## Notification Actions

### Mark as Read
| Action | Behavior |
|---|---|
| Click notification | Mark as read + navigate to linked issue |
| Hover → "Mark read" button | Mark single notification as read |
| "Mark All as Read" button | Marks all unread as read via API |

### Bulk Actions
- Select mode: tap/click checkbox on each item
- Bottom bar: [Mark Read] [Mark Unread]

---

## Data Fetching

### Initial Load
```typescript
// Server component fetch
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .range(0, 49)  // first 50
```

### Pagination
- "Load More" button at bottom (not infinite scroll for MVP)
- 50 notifications per page
- "Showing 50 of 234"

### Realtime Subscription
```typescript
supabase
  .channel('my-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    prependNotification(payload.new)
    incrementBellCount()
    showToast(payload.new)
  })
  .subscribe()
```

---

## Notification Preferences (Future)

Placeholder section at bottom of page:
- Currently showing: "Notification preferences coming soon."
- Future: toggle push notification types

---

## Unread Count (Global)

The notification bell unread count is fetched:
1. Initial server render: via server component query
2. Client-side updates: via Realtime subscription (increment on INSERT)
3. Periodic sync: every 5 minutes via query

### Optimistic Update
- Clicking a notification in the bell dropdown → optimistically decrement count
- Mark all as read → set count to 0 immediately
- Reconcile on next server fetch

---

## Acceptance Criteria
- [ ] Notification bell shows correct unread count
- [ ] Bell dropdown shows last 5 unread with preview text
- [ ] Click notification in dropdown marks as read + navigates
- [ ] "View All" navigates to `/dashboard/notifications`
- [ ] Notifications page grouped by date sections
- [ ] Unread items have bold text + dot indicator
- [ ] "Mark All as Read" sets all to read via API
- [ ] Click notification on page → mark as read + navigate
- [ ] Realtime: new notification appears in bell within 2 seconds
- [ ] Realtime: new notification appears in page without refresh
- [ ] Toast appears on new notification (auto-dismiss 5s)
- [ ] Empty state renders when no notifications exist
- [ ] Load More pagination works correctly
- [ ] Pagination shows total count
