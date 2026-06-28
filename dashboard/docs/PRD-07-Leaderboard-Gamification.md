# PRD-07: Leaderboard & Gamification

## Overview
Display the community leaderboard showing top citizens by Hero Score. Badge showcase per user, ranking stats, and weekly/monthly highlights. This view is read-only for admins but serves as a community health indicator.

---

## Route
`/dashboard/leaderboard`

---

## Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Community Leaderboard            [Period: All Time ▼] [⟳]    │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ 🏆 Top Heroes                                              │ │
│ │                                                            │ │
│ │ 🥇  Priya Sharma          1,240 pts  🏅🏅🏅  48 reports   │ │
│ │ 🥈  Rajan Mehta           980 pts   🏅🏅    31 reports    │ │
│ │ 🥉  Anika Patel           875 pts   🏅🏅    27 reports    │ │
│ │                                                            │ │
│ │ 4   Vikram Singh          720 pts   🏅      22 reports    │ │
│ │ 5   Deepa Nair            650 pts   🏅      19 reports    │ │
│ │ …                                                          │ │
│ │                                                            │ │
│ │ Your Rank: #24 of 312  (85th percentile)                   │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Badge Gallery                                              │ │
│ │                                                            │ │
│ │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐             │ │
│ │ │ 🥇   │ │ 👁️   │ │ 🧩   │ │ 🏗️   │ │ ⚡   │             │ │
│ │ │First │ │Neigh-│ │Commu-│ │Prob- │ │Speed │             │ │
│ │ │Report│ │borhd │ │nity  │ │Solver│ │Rptr  │             │ │
│ │ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │ │
│ │                                                            │ │
│ │ Total badges awarded: 1,245                                │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│ ┌──────────────────┐  ┌────────────────────────────────────┐  │
│ │ Top Categories    │  │ Hero Score Distribution            │  │
│ │ by Reporters      │  │ [Bar Chart]                        │  │
│ │                   │  │                                    │  │
│ │ Pothole    42% ██ │  │ 0-100   ████████                   │  │
│ │ Garbage    23% ██ │  │ 100-500 ██████████████             │  │
│ │ Water      15% █  │  │ 500+    ██████                     │  │
│ │ Streetlight 12%   │  │                                    │  │
│ └──────────────────┘  └────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Leaderboard Table

### Data Source
`GET /leaderboard?scope=city&period=all_time&limit=50`

### Columns

| Column | Description |
|---|---|
| Rank | #1, #2, #3 with trophy icons; 4+ with number |
| User | Avatar + name (link to profile if available) |
| Hero Score | Number with star icon; animated counter on load |
| Badges | Badge icon strip (max 3 shown; "+N more" if more) |
| Reports | Total reports submitted |
| Resolved | Issues resolved |
| Verification Rate | "X verifications given" |
| Member Since | Relative date |

### Top 3 Highlight
- Ranks 1-3 have special styling:
  - 🥇 Gold background / border
  - 🥈 Silver background / border
  - 🥉 Bronze background / border
- Larger avatar size for top 3

### Current User's Rank
- Sticky row at bottom (or inline if in top N)
- "Your Rank: #24 of 312 — You're in the top 85%!"
- My score vs top score: progress bar showing relative position

### Empty State
- "No community members yet. Be the first to report an issue!"
- Invitation-style CTA (informational, no action since admins can't report)

---

## Badge Gallery

### Badge Cards

| Badge | Slug | Icon | Description |
|---|---|---|---|
| First Responder | `first_report` | 🥇 | First issue reported |
| Neighborhood Watch | `neighborhood_watch` | 👁️ | 10 issues reported |
| Community Pillar | `community_pillar` | 🧩 | 50 verifications given |
| Problem Solver | `problem_solver` | 🏗️ | 5 issues resolved |
| Speed Reporter | `speed_reporter` | ⚡ | Report within 1hr of issue |
| City Hero | `top_hero` | 🏆 | Top 10 on leaderboard |
| Verified Reporter | `verified_reporter` | ✅ | 3 reports verified |
| Super Verifier | `super_verifier` | 👍 | 10 verifications in 1 day |

### Gallery Layout
- Grid of badge cards showing: icon, name, short description
- Badges without any awardees shown at reduced opacity with "0 awarded"
- Total badge count at top: "1,245 badges awarded"

---

## Sidebar Stats

### Top Categories by Reporters
- Simple horizontal bar chart
- Shows what community is reporting most
- Sourced from analytics endpoint

### Hero Score Distribution
- Bar chart showing how many users fall into each score bucket
- Buckets: 0-100, 100-500, 500+
- Helps admins understand community engagement level

---

## Period Filter

| Option | Description |
|---|---|
| All Time | Default — total accumulation |
| This Month | Scores earned this month only |
| This Week | Scores earned this week only |

**Note:** For MVP, period filter may only support "All Time" (backend limitation). Period filter is hidden if backend doesn't support it.

---

## Interactions

| Action | Behavior |
|---|---|
| Click user row | Navigate to user profile (if implemented) |
| Hover badge | Tooltip with badge name + description |
| Hover rank | Tooltip: "Based on hero score" |
| Click period | Refetch leaderboard data |

---

## Loading State

- Table skeleton: 10 rows with animated placeholders
- Badge gallery: grid of gray rounded rectangles
- Charts: skeleton bars
- Current user rank: pulsing text placeholder

---

## Error State

- "Leaderboard unavailable. Please try again."
- "Badge data could not be loaded."
- Retry button on each failed section

---

## Acceptance Criteria
- [ ] Leaderboard loads top 50 users sorted by hero_score DESC
- [ ] Top 3 have gold/silver/bronze styling
- [ ] Current admin's rank displayed at bottom (if they have a citizen profile)
- [ ] Badge gallery shows all 8 badges with count per badge
- [ ] Badge cards at 0 opacity if no one has earned them
- [ ] Period filter visible (even if backend-limited)
- [ ] User rows show avatar, name, score, report counts
- [ ] Score counter animates on initial load
- [ ] Loading skeleton for initial page load
- [ ] Error state with retry
