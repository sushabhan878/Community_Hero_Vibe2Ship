# PRD-06: Community Verification

## Overview
Citizens can upvote/verify issues they witness in-person. This adds credibility, helps filter false reports, and triggers status upgrades at threshold milestones.

---

## Verification UX Patterns

### Verify Button (Issue Detail Screen)
**States:**

| State | Visual | Action |
|---|---|---|
| Not verified | Outline icon + "Verify (N)" | Tap to verify |
| Verified | Filled icon + "Verified (N)" | Tap to unverify |
| Own issue | Hidden / disabled | Cannot verify own report |
| Not verifiable status | Grayed out + "Verification closed" | No action |

**Animation:**
- On verify: icon fills with green + scale bounce + count increments with number roll
- On unverify: icon returns to outline + count decrements smoothly
- Haptic feedback on both actions

---

### Verification Count Badge
- Shown on issue cards in feed list
- Shown prominently in issue detail
- Color changes at milestones:
  - 0-4: gray
  - 5-9: green (verified threshold met)
  - 10+: gold (trending)

---

### Verification Milestone Toast
When a verification milestone is reached (5, 10, 25, 50):
- In-app toast notification for the reporter
- Confetti animation (optional, if time permits)
- Timeline entry added automatically

---

## Verification Flow

### Verify
1. User taps "Verify" on issue detail
2. Client-side check: is issue verifiable? (status = ai_processed or verified)
3. Call `POST /issues/:id/verify`
4. On success:
   - Update local state: `has_verified = true`, increment count
   - Show success toast: "Verified! +2 Hero Score"
   - Update profile's total_verified in local cache
5. On error:
   - Show error toast with message
   - Handle specific errors: `ALREADY_VERIFIED`, `CANNOT_VERIFY_OWN`, `ISSUE_NOT_VERIFIABLE`

### Unverify
1. User taps "Verified" button on issue detail
2. Confirmation: "Remove your verification?" (Android-style dialog)
3. Call `DELETE /issues/:id/verify`
4. On success:
   - Update local state: `has_verified = false`, decrement count
   - If count drops below 5 and status was "verified", show note: "Status reverted to AI Processed"
5. On error:
   - `CANNOT_UNVERIFY_AFTER_PROGRESS`: "Issue is already being worked on"

---

## Anti-Abuse Indicators

### Rate Limit Guard
- Before calling verify API, check locally: "20 verifications/hour limit"
- Track local count of verifications in last hour
- Show warning if approaching limit: "You're verifying quickly — slow down"

### Geographic Proximity (soft)
- Show prompt if user is >2km from issue location:
  "You seem far from this issue. Did you witness it in person?"
- Allow "I saw it" confirmation to proceed

---

## Verification List Screen

**Optional screen when tapping verification count:**

```
Verifications (12)
┌─────────────────────┐
│ Avatar  Priya S.     │
│         2h ago       │
├─────────────────────┤
│ Avatar  Rajan K.     │
│         3h ago       │
├─────────────────────┤
│ ...                  │
└─────────────────────┘
```

- Pulled from `GET /issues/:id/verifications`
- Infinite scroll list of verifiers
- Tap on verifier → navigate to their public profile

---

## Hero Score Impact

| Action | Change |
|---|---|
| Give verification | +2 hero score |
| Remove verification | -2 hero score (floor 0) |
| Report reaches 5 verifications | +15 hero score (to reporter) |

---

## API Integration

### Verify
```typescript
const { data } = await supabase.functions.invoke(`issues/${id}/verify`, {
  method: 'POST',
})
```

### Unverify
```typescript
const { data } = await supabase.functions.invoke(`issues/${id}/verify`, {
  method: 'DELETE',
})
```

### Get Verifications
```typescript
const { data } = await supabase.functions.invoke(`issues/${id}/verifications`, {
  method: 'GET',
  query: { page, limit },
})
```

---

## Acceptance Criteria
- [ ] Verify button toggles correctly (verify ↔ verified)
- [ ] Own issue shows disabled verify button
- [ ] Verification count updates with animation
- [ ] Unverify works with confirmation dialog
- [ ] Rate limit warning shown when approaching limit
- [ ] Geographic proximity prompt shown when far from issue
- [ ] Error states handled gracefully (already verified, etc.)
- [ ] Hero score +2 toast shown on verify
- [ ] Realtime: verification count updates from other users without refresh
