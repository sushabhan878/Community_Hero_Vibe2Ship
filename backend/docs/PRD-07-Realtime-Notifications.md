# PRD-07: Realtime & Push Notifications

## Overview
Citizens and department admins need live updates without polling. This PRD covers Supabase Realtime subscriptions (WebSocket-based) for the mobile app and dashboard, plus Expo Push Notifications for background alerts.

---

## Two Notification Channels

| Channel | Delivery | Use Case |
|---|---|---|
| **Supabase Realtime** | WebSocket, in-app | App is open — live feed updates, dashboard counts |
| **Expo Push** | FCM/APNs | App is backgrounded/closed — status change alerts |

Both channels are sent together for the same event. If the app is open, Realtime fires first (< 100ms); push arrives seconds later and is dismissed/handled by the app.

---

## Supabase Realtime Subscriptions

### Mobile App Subscriptions

**1. Own Issues Feed**
Subscribe to changes on the reporter's issues.
```typescript
supabase
  .channel('my-issues')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'issues',
    filter: `reporter_id=eq.${userId}`
  }, (payload) => {
    // payload.eventType: INSERT | UPDATE | DELETE
    // payload.new: updated issue row
    handleIssueUpdate(payload);
  })
  .subscribe();
```

**2. Issue Detail (when viewing a specific issue)**
```typescript
supabase
  .channel(`issue-${issueId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'issue_updates',
    filter: `issue_id=eq.${issueId}`
  }, (payload) => {
    appendToTimeline(payload.new);
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'issues',
    filter: `id=eq.${issueId}`
  }, (payload) => {
    updateIssueDetail(payload.new);
  })
  .subscribe();
```

**3. Notifications Bell**
```typescript
supabase
  .channel('my-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    incrementBellCount();
    showInAppToast(payload.new.title, payload.new.body);
  })
  .subscribe();
```

---

### Dashboard Subscriptions

**1. Issues Table (live count updates)**
```typescript
supabase
  .channel('dept-issues')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'issues',
    filter: `assigned_department_id=eq.${deptId}`
  }, (payload) => {
    refreshIssueList();
    updateStatusCounts();
  })
  .subscribe();
```

**2. Realtime Stats Widget**
```typescript
supabase
  .channel('dashboard-stats')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'issues'
  }, () => {
    invalidateStatsQuery(); // refetch aggregation
  })
  .subscribe();
```

---

## Notifications System

### In-App Notification Endpoints

#### `GET /notifications`
**Auth required:** Yes

**Query Parameters:**
```
page    int     default: 1
limit   int     default: 20
unread  boolean default: false (all) | true (unread only)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "issue_resolved",
        "title": "Issue Resolved!",
        "body": "Your pothole report on MG Road has been resolved.",
        "issue_id": "uuid",
        "read": false,
        "created_at": "2025-01-16T15:00:00Z"
      }
    ],
    "unread_count": 3,
    "pagination": { "page": 1, "limit": 20, "total": 8, "has_more": false }
  }
}
```

---

#### `PATCH /notifications/read`
**Auth required:** Yes

Mark specific notifications or all as read.

**Request Body:**
```json
{
  "notification_ids": ["uuid1", "uuid2"],  // specific IDs, OR:
  "all": true                               // mark all as read
}
```

**Logic:**
```typescript
if (body.all) {
  await supabase.from('notifications')
    .update({ read: true })
    .eq('user_id', auth.uid())
    .eq('read', false);
} else {
  await supabase.from('notifications')
    .update({ read: true })
    .in('id', body.notification_ids)
    .eq('user_id', auth.uid()); // ownership check
}
```

---

## Push Notification Flow

### When Push is Sent

| Event | Recipient | Title | Body |
|---|---|---|---|
| Issue AI processed | Reporter | "Issue Routed" | "Your [category] report was assigned to [dept]." |
| Issue verified (5 verifications) | Reporter | "5 Verifications!" | "Citizens confirmed your issue." |
| Issue status → in_progress | Reporter + Verifiers | "Work Started" | "The [dept] is now working on the issue." |
| Issue resolved | Reporter + Verifiers | "Issue Resolved!" | "Your reported [category] has been fixed." |
| New issue assigned | Dept Admins | "New Issue Assigned" | "New [severity] [category] in your area." |
| Milestone (10, 25, 50 verifications) | Reporter | "X Verifications!" | "Your issue is trending!" |
| Badge earned | User | "Badge Earned 🏅" | "You earned the [badge_name] badge!" |

---

### Push Delivery Edge Function: `send-push-notification`

Internal function, called by other Edge Functions.

```typescript
interface PushPayload {
  user_ids: string[];           // batch — can send to multiple users
  title: string;
  body: string;
  data?: Record<string, string>; // deep-link data
  issue_id?: string;
}

async function sendPushNotification(payload: PushPayload) {
  // 1. Fetch all push tokens for these user_ids
  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token, user_id')
    .in('user_id', payload.user_ids);

  if (!tokens?.length) return;

  // 2. Build Expo push messages
  const messages = tokens.map(({ token }) => ({
    to: token,
    title: payload.title,
    body: payload.body,
    data: {
      issue_id: payload.issue_id,
      ...payload.data
    },
    sound: 'default',
    priority: 'high'
  }));

  // 3. Send to Expo Push API (batch up to 100 per request)
  const chunks = chunkArray(messages, 100);
  for (const chunk of chunks) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(chunk)
    });

    const result = await response.json();

    // 4. Handle invalid tokens (remove from DB)
    for (const ticket of result.data) {
      if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
        await supabase.from('push_tokens')
          .delete()
          .eq('token', ticket.to);
      }
    }
  }
}
```

---

### Also Insert In-App Notification
Push is always paired with an in-app `notifications` row:

```typescript
await supabase.from('notifications').insert(
  payload.user_ids.map(uid => ({
    user_id: uid,
    issue_id: payload.issue_id,
    type: payload.type,
    title: payload.title,
    body: payload.body
  }))
);
```

---

## Mobile App: Handling Received Push

```typescript
// In app/_layout.tsx (Expo)
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Handle tap on notification (app was background/closed)
Notifications.addNotificationResponseReceivedListener((response) => {
  const { issue_id } = response.notification.request.content.data;
  if (issue_id) {
    router.push(`/issue/${issue_id}`);  // deep link to issue
  }
});
```

---

## Notification Preferences (Future)

Store in `profiles.notification_preferences` (JSONB column — add in migration):
```json
{
  "push_on_status_change": true,
  "push_on_verification": true,
  "push_on_milestone": false
}
```

For MVP: all notifications on by default, no preference UI needed.

---

## Acceptance Criteria
- [ ] Realtime: status change in DB reflects on open mobile screen within 2 seconds
- [ ] Realtime: new issue_update entry appears in timeline without refresh
- [ ] Dashboard: new issue assignment appears in dept table without refresh
- [ ] Push: reporter receives push when issue moves to `in_progress`
- [ ] Push: dept admins receive push when new issue assigned to their dept
- [ ] Push tap navigates to correct issue detail screen
- [ ] Invalid/expired Expo tokens are removed from DB automatically
- [ ] `GET /notifications` returns correct unread count
- [ ] `PATCH /notifications/read` with `all: true` marks all as read
- [ ] In-app notifications inserted alongside every push send
- [ ] No duplicate notifications for same event (idempotency check)
