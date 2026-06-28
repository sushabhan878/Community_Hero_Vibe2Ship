# PRD-08: Gamification & Leaderboard

## Overview
Drive engagement through hero scores, badges, and a community leaderboard. Users earn points for reporting, verifying, and getting issues resolved. Badges recognize achievements.

---

## Screen: Leaderboard (`leaderboard.tsx`)

### Layout
```
┌─────────────────────────────────┐
│ 🏆 Leaderboard                  │
│ [City] [▼ Ward filter]          │
│ [Week] [Month] [All Time]       │
├─────────────────────────────────┤
│ Top 3 Podium                    │
│  ┌──┐  ┌──┐  ┌──┐              │
│  │🥈│  │🥇│  │🥉│              │
│  │ 2 │  │ 1 │  │ 3 │            │
│  └──┘  └──┘  └──┘              │
│ Priya  Rajan  Amit             │
│  1250   1100    980             │
├─────────────────────────────────┤
│ Rank │ Name          │ Score    │
│ #4   │ [Avatar]      │ 850      │
│      │ Sneha Patel   │ 12 rep   │
│ #5   │ ...           │ ...      │
│ ...  │               │          │
├─────────────────────────────────┤
│ Your Rank: #7 of 342 citizens   │
│ You're in the top 3%!           │
└─────────────────────────────────┘
```

### Podium Section
- Top 3 users with gold/silver/bronze styling
- Avatar, name, hero score, crown icon for #1
- Animated entrance (slide up on load)

### Leaderboard List
- Rank number, avatar, name, hero score
- Secondary stat: total_reports or total_resolved
- Current user's row highlighted with different background
- Infinite scroll (page size: 50)

### Filters
- Scope: City (default) | Ward
- Ward picker (only if scope = ward)
- Period: This Week | This Month | All Time (default)

---

## Screen: Profile Stats (`profile.tsx` — Stats Section)

### Hero Score Card
- Large score number with animated counter
- Progress to next rank/tier (if applicable)
- Score breakdown: Reports (+X), Verifications (+Y), Resolved (+Z)

### Badges Section
```
My Badges (4 of 8)
┌─────────────────────────────┐
│ 🏅 First Responder          │
│    Reported your first issue │
│    Earned Jan 15, 2025      │
├─────────────────────────────┤
│ 🏅 Neighborhood Watch       │
│    10 issues reported       │
│    Locked: 8/10 issues      │ ★ progress bar
└─────────────────────────────┘
```

**Badge States:**
- Earned: full color, earned date shown
- Locked: grayscale, progress shown (e.g., "8/10 issues")

### Badge List (All 8)

| Badge | Slug | Criteria |
|---|---|---|
| First Responder | first_report | Report your first issue |
| Neighborhood Watch | neighborhood_watch | Report 10 issues |
| Community Pillar | community_pillar | Give 50 verifications |
| Problem Solver | problem_solver | Get 5 reports resolved |
| Speed Reporter | speed_reporter | Report within 1hr of issue starting |
| City Hero | top_hero | Top 10 on leaderboard |
| Verified Reporter | verified_reporter | Get 3 reports verified |
| Super Verifier | super_verifier | Give 10 verifications in one day |

---

## Score Feedback Animations

### On Action Completion
When user performs a score-earning action:
- Toast: "+10 Hero Score!" with green icon
- Quick score animation (number counts up briefly where score is displayed)
- Badge unlock: full-screen modal "🏅 New Badge!" with badge art and name

### Score Events

| Action | Points | UI Feedback |
|---|---|---|
| Submit report | +10 | Toast: "+10 Hero Score" |
| Report reaches 5 verifications | +15 | Toast: "+15 Hero Score — Issue Verified!" |
| Report resolved | +25 | Modal: "+25 Hero Score!" |
| Give verification | +2 | Toast: "+2 Hero Score" |
| Remove verification | -2 | Toast: "-2 Hero Score" (subtle) |
| First report in ward today | +20 | Toast: "+20 First Report Today!" |

---

## API Integration

### Leaderboard
```typescript
const { data } = await supabase.functions.invoke('leaderboard', {
  method: 'GET',
  query: { scope: 'city', period: 'all_time', limit: 50 },
})
```

### Profile Stats
```typescript
const { data } = await supabase.functions.invoke(`profile/${userId}/stats`, {
  method: 'GET',
})
```

### Badges
```typescript
// Badges are included in the GET /profile/me response
// No separate endpoint needed
```

---

## Realtime Updates

- Subscribe to `badges` table INSERT for current user
- On badge earned: show "New Badge!" modal
- Subscribe to `profiles` UPDATE for hero_score changes
- Update leaderboard position in realtime

---

## Acceptance Criteria
- [ ] Leaderboard loads top users with pagination
- [ ] Current user's rank is highlighted
- [ ] Scope/period filters work correctly
- [ ] Podium shows top 3 with medals
- [ ] Badges show earned/locked states with progress
- [ ] Score toast appears on report submission
- [ ] Score toast appears on verification
- [ ] Badge unlock modal appears when badge earned
- [ ] Leaderboard updates in realtime
- [ ] Profile stats show correct score breakdown
