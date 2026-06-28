# PRD-07: Notifications

## Overview
Two-channel notification system: in-app notifications (bell icon tab) and push notifications (device lock screen / notification center). Realtime updates via Supabase Realtime.

---

## Screen: Notifications (`(tabs)/notifications.tsx`)

### Layout
```
┌─────────────────────────────────┐
│ 🔔 Notifications                │
│ [Mark all read]  [Filter]       │
├─────────────────────────────────┤
│ Today                           │
│ ┌─────────────────────────────┐ │
│ │ Icon  Title                  │ │
│ │       Body text (1 line)    │ │
│ │       2h ago                │ │
│ └─────────────────────────────┘ │
│ Yesterday                       │
│ ┌─────────────────────────────┐ │
│ │ ...                         │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Notification Item

**Components:**
- Icon by type (e.g., verified → shield, assigned → hard-hat, resolved → checkmark)
- Title (bold if unread)
- Body text (1-2 lines)
- Relative timestamp
- Background color: white (read) vs light blue (unread)

**Behavior:**
- Tap → navigate to related issue (`issue/[id]`)
- Long-press → context menu: Mark as read, Delete
- Swipe to dismiss (mark as read)

---

### Notification Types & Icons

| Type | Icon | Color |
|---|---|---|
| issue_verified | shield-check | Green |
| issue_assigned | account-hard-hat | Amber |
| issue_updated | information | Blue |
| issue_resolved | checkmark-circle | Green |
| verification_milestone | account-group | Purple |
| badge_earned | trophy | Gold |

---

### Unread Badge

- Tab bar badge showing unread count
- Updated via realtime subscription to `notifications` table
- Cleared when viewing notification screen
- App icon badge (iOS) via `expo-notifications`

---

## Push Notifications

### Setup (`providers/NotificationProvider.tsx`)

1. Request permission on first app launch (with explanation)
2. Register for push notifications via `expo-notifications`
3. Get Expo Push Token
4. Send token to backend via `POST /profile/push-token`

```typescript
async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionAsync()
  if (status !== 'granted') return

  const token = await Notifications.getExpoPushTokenAsync()
  await supabase.functions.invoke('profile/push-token', {
    method: 'POST',
    body: { token: token.data, platform: Platform.OS },
  })
}
```

### Handling Incoming Push

```typescript
// In NotificationProvider
Notifications.addNotificationResponseReceivedListener((response) => {
  const { issue_id } = response.notification.request.content.data
  if (issue_id) {
    router.push(`/issue/${issue_id}`)
  }
})
```

### Deep Linking from Push

| Notification Type | Deep Link |
|---|---|
| issue_verified | `/issue/{issue_id}` |
| issue_assigned | `/issue/{issue_id}` |
| issue_updated | `/issue/{issue_id}` |
| issue_resolved | `/issue/{issue_id}` |
| verification_milestone | `/issue/{issue_id}` |
| badge_earned | `/leaderboard` |

---

## Realtime Subscriptions

### In-App Updates (Supabase Realtime)

```typescript
// Subscribe to user's notifications
const channel = supabase
  .channel('my-notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    },
    (payload) => {
      // Add to top of notification list
      // Increment unread badge count
      // Show toast if app is foregrounded
    }
  )
  .subscribe()
```

### Toast Notifications (Foreground)

When app is in foreground and a notification arrives:
- Show top banner toast (non-intrusive, auto-dismiss 4s)
- Similar to iOS notification banner style
- Tap → navigate to related screen
- Swipe to dismiss

---

## Notification Settings

### In Profile Screen
- Toggle: Push notifications on/off
- Toggle per type: Verifications, Status Updates, Badges
- Clear all notifications button

### Local State
- `settings.notifications.push` — master toggle
- `settings.notifications.types` — per-type preferences (local filter only)

---

## API Integration

### Fetch Notifications
```typescript
const { data } = await supabase.functions.invoke('notifications', {
  method: 'GET',
  query: { page, limit: 30, unread: filterUnread },
})
```

### Mark Read
```typescript
const { data } = await supabase.functions.invoke('notifications/read', {
  method: 'PATCH',
  body: { ids: [notificationId], all: false },
})
```

---

## Acceptance Criteria
- [ ] Notification list loads with pagination
- [ ] Unread count badge updates in realtime
- [ ] Tap notification navigates to correct screen
- [ ] Push notification opens deep link from cold start
- [ ] Foreground toast shows on new notification
- [ ] Mark all read works
- [ ] Swipe to dismiss marks as read
- [ ] Permission request shows on first launch
- [ ] Push token registered with backend
