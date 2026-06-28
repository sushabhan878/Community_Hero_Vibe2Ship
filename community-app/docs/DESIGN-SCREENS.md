# Community Hero — Screen Design Specification

## Design Tokens

### Colors
```
Primary:      #059669  (emerald-600)
PrimaryDark:  #047857  (emerald-700)
PrimaryLight: #A7F3D0  (emerald-200)

Danger:       #DC2626  (red-600)
Warning:      #D97706  (amber-600)
Info:         #2563EB  (blue-600)

Severity:
  Low:        #22C55E  (green-500)
  Medium:     #EAB308  (yellow-500)
  High:       #F97316  (orange-500)
  Critical:   #EF4444  (red-500)

Surface:
  BG:         #FFFFFF
  Surface:    #F9FAFB  (gray-50)
  Card:       #FFFFFF
  Border:     #E5E7EB  (gray-200)

Text:
  Primary:    #111827  (gray-900)
  Secondary:  #6B7280  (gray-500)
  Muted:      #9CA3AF  (gray-400)
```

### Typography
```
Heading 1:  Bold, 24px, 1.3 leading
Heading 2:  Bold, 20px, 1.3
Heading 3:  Semibold, 18px, 1.4
Body:       Regular, 16px, 1.5
Body Small: Regular, 14px, 1.5
Caption:    Regular, 12px, 1.4
Button:     Semibold, 16px
Tab:        Medium, 12px
```

### Spacing (4px base)
```
xs:  4   sm:  8   md:  12   lg:  16
xl:  20  2xl: 24  3xl: 32  4xl: 40
```

### Borders
```
Card radius:      12px
Button radius:    8px
Badge radius:     16px (pill)
Avatar radius:    50% (circle)
Input radius:     8px
Modal radius:     16px (top corners only)
```

### Shadows
```
Card shadow:
  iOS:  {color: #000, opacity: 0.08, offset: 0,2, blur: 8}
  Android: elevation: 3

Elevated:
  iOS:  {color: #000, opacity: 0.12, offset: 0,4, blur: 16}
  Android: elevation: 6
```

---

## Component Library

### C1. IssueCard
```
┌──────────────────────────────────┐
│ ┌──────┐  Title (2 lines max)    │
│ │ Img  │  Category • Severity    │
│ │      │  📍 Address (1 line)    │
│ └──────┘  ⏰ 2h ago  ✅ 5 verif  │
│           [Status Badge]         │
└──────────────────────────────────┘
```
**Props:** `issue`, `onPress`, `showDistance`
**States:** default, pressed (scale 0.98), loading (skeleton)

### C2. StatusBadge
```
[ Pending ]    gray
[ In Progress  ] amber
[ Resolved   ] green
```
**Props:** `status`, `size` (sm/md)
**Colors mapped to 8 statuses**

### C3. SeverityBadge
```
[ Low ]    green
[ Medium ] yellow
[ High ]   orange
[ Critical  ] red
```
**Props:** `severity`, `size`

### C4. CategoryIcon
```
🚧 Pothole    💧 Water Leak    🗑️ Garbage
💡 Streetlight  🌳 Tree    🔌 Other
```
**Props:** `category`, `size`
**Icons:** MaterialCommunityIcons mapping

### C5. Avatar
```
[圆形图片] 36px / 48px / 64px
```
**Props:** `url`, `name` (fallback initials), `size`
**States:** loaded, loading, error (initials)

### C6. KpiCard
```
┌──────────┐
│    42    │  ← large number
│  Total   │  ← label
│ Issues   │
│  ▲ 12%   │  ← optional delta
└──────────┘
```
**Props:** `label`, `value`, `delta`, `color`

### C7. TimelineItem
```
● ──────────────────────────────────
│  Icon + Label
│  Note text (optional)
│  ⏰ 2h ago
```
**Props:** `type`, `label`, `note`, `timestamp`, `isFirst`, `isLast`

### C8. BottomSheet
```
┌──────────────────────────┐
│ ─── (drag handle)        │
│                          │
│  Content (scrollable)    │
│                          │
│ [Action Button]          │
└──────────────────────────┘
```
**Props:** `isOpen`, `onClose`, `snapPoints`, `children`
**Behavior:** drag to dismiss, backdrop overlay

### C9. Toast
```
┌─────────────────────────┐
│ ✅ Issue reported!      │  ← auto-dismiss 3s
└─────────────────────────┘
```
**Types:** success (green), error (red), info (blue), warning (amber)
**Position:** top (below status bar)

### C10. Skeleton
```
┌──────────────────────────┐
│ ████████  ██████████████ │  ← shimmer animation
│ ████████  ██████         │
│           ██████████████ │
└──────────────────────────┘
```
**Variants:** card, list-row, detail, chart

---

## Screen Inventory (14 screens)

| # | Screen | Route | Role |
|---|---|---|---|
| S01 | Onboarding | `(auth)/index` | All |
| S02 | Sign In | `(auth)/sign-in` | All |
| S03 | Sign Up | `(auth)/sign-up` | Citizen |
| S04 | Issue Feed | `(tabs)/index` (list) | All |
| S05 | Issue Map | `(tabs)/index` (map) | All |
| S06 | Issue Detail | `issue/[id]` | All |
| S07 | Report Issue | `(tabs)/report` | Citizen |
| S08 | Notifications | `(tabs)/notifications` | All |
| S09 | Profile | `(tabs)/profile` | All |
| S10 | Leaderboard | `leaderboard` | All |
| S11 | Admin Dashboard | `admin/index` | Dept Admin |
| S12 | Admin Issues Table | `admin/issues` | Dept Admin |
| S13 | Analytics | `analytics/index` | All/Dept Admin |
| S14 | Edit Profile | modal | All |

---

## S01 — Onboarding

```
┌────────────────────────────────────┐
│                              [Skip]│
│                                    │
│         📸 (illustration)          │
│                                    │
│   Report Issues in Your Area       │
│   Snap a photo, describe the       │
│   problem, and alert your city.    │
│                                    │
│   ○ ● ○ ○                          │  ← page dots
│                                    │
│         [Get Started]              │
│                                    │
│   Already have an account? Sign In │
└────────────────────────────────────┘
```

**Slides (4):**
1. **Report Issues** — Camera illustration, "Snap & describe problems"
2. **AI Powered** — Robot illustration, "Smart categorization & routing"
3. **Community** — People illustration, "Neighbors verify & upvote"
4. **Impact** — Chart illustration, "Track resolutions & earn rewards"

**States:**
- First launch: show carousel
- Returning user: skip to sign-in

**Interactions:**
- Swipe left/right between slides
- Dot indicators update
- "Skip" → navigate to sign-in, store `onboarding_seen: true`
- "Get Started" (last slide) → navigate to sign-up
- "Sign In" link → navigate to sign-in

---

## S02 — Sign In

```
┌────────────────────────────────────┐
│                                    │
│           👋 Welcome Back          │
│                                    │
│   ┌──────────────────────────┐    │
│   │  email@example.com       │    │
│   └──────────────────────────┘    │
│   ┌──────────────────────────┐    │
│   │  •••••••••               │    │
│   └──────────────────────────┘    │
│        Forgot password?           │
│                                    │
│         [Sign In]                  │
│                                    │
│   ──── or continue with ────      │
│                                    │
│         [G] Sign in with Google    │
│                                    │
│   Don't have an account? Sign Up   │
└────────────────────────────────────┘
```

**Validation Errors:**
```
   ┌──────────────────────────┐
   │  email@example        ✕  │  ← red border
   └──────────────────────────┘
   Please enter a valid email  ← error text below
```

**States:**
- Default: empty fields, "Sign In" disabled
- Filling: validation shown on blur, button enabled when valid
- Loading: spinner in button, fields disabled
- Error: toast at top, shake animation on button
- Success: navigate to feed

**Edge Cases:**
- Network error: "No internet connection" toast + retry button
- Account disabled: "Your account has been disabled" error message
- Too many attempts: "Too many attempts. Try again in 15 minutes."

---

## S03 — Sign Up

```
┌────────────────────────────────────┐
│                                    │
│        📝 Create Account           │
│                                    │
│   ┌──────────────────────────┐    │
│   │  Full Name               │    │
│   └──────────────────────────┘    │
│   ┌──────────────────────────┐    │
│   │  email@example.com       │    │
│   └──────────────────────────┘    │
│   ┌──────────────────────────┐    │
│   │  Password (min 8 chars)  │    │
│   └──────────────────────────┘    │
│   ┌──────────────────────────┐    │
│   │  Phone (optional)        │    │
│   └──────────────────────────┘    │
│                                    │
│   By signing up, you agree to      │
│   Terms of Service & Privacy      │
│                                    │
│         [Create Account]           │
│                                    │
│   Already have an account? Sign In │
└────────────────────────────────────┘
```

**Password Requirements Checklist:**
```
☐ At least 8 characters
☐ Contains a number
☐ Contains a letter
```

**States:**
- Default: empty, button disabled
- Validating: inline checks on password
- Error: email taken → "This email is already registered. Sign in instead?"
- Success: auto-login → navigate to feed

---

## S04 — Issue Feed (List)

```
┌────────────────────────────────────┐
│ 🔍 Search issues...        [Filter]│
│                                    │
│ [All] [Pending] [Verified] [In Pr]←│  ← filter chips (horizontal scroll)
│                                    │
│ ┌──────────────────────────────┐  │
│ │ ┌────┐ Pothole on MG Road   │  │  ← IssueCard
│ │ │    │ 🔧 Pothole • High     │  │
│ │ │ img│ 📍 MG Road, Bangalore │  │
│ │ └────┘ ⏰ 2h ago  ✅ 5 verif │  │
│ │        [Verified]            │  │
│ └──────────────────────────────┘  │
│ ┌──────────────────────────────┐  │
│ │ ┌────┐ Water Leak in         │  │
│ │ │    │ Indiranagar           │  │
│ │ │ img│ 💧 Water Leak • Med   │  │
│ │ └────┘ 📍 Indiranagar        │  │
│ │        ⏰ 5h ago  ✅ 2 verif │  │
│ │        [AI Processed]        │  │
│ └──────────────────────────────┘  │
│                                    │
│         ┌──────────┐              │
│         │  List  Map │              │  ← mode toggle
│         └──────────┘              │
└────────────────────────────────────┘
```

**Filter Bottom Sheet (open state):**
```
┌──────────────────────────────────┐
│ ─── Filters                      │
│                                  │
│ Category                         │
│ ☑ All  ☐ Pothole  ☐ Road Damage │
│ ☐ Water Leak  ☐ Sewage           │
│ ☐ Streetlight  ☐ Garbage          │
│                                  │
│ Status                           │
│ ○ All  ○ Pending  ○ Verified     │
│ ○ In Progress  ○ Resolved        │
│                                  │
│ Severity                         │
│ ☑ All  ☐ Low  ☐ Medium          │
│ ☐ High  ☐ Critical               │
│                                  │
│     [Reset]      [Apply (3)]     │
└──────────────────────────────────┘
```

**States:**
- Loading: 3 skeleton IssueCards
- Empty: illustration + "No issues yet" + CTA button
- Error: "Something went wrong" + Retry button
- Refreshing: pull-to-refresh indicator
- Loading more: bottom spinner (infinite scroll)

---

## S05 — Issue Map

```
┌────────────────────────────────────┐
│ 🔍 Search...              [Filter] │
│                                    │
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │        🟡 🟢                 │  │  ← map with clustered markers
│  │     🔴                        │  │
│  │           🟠 🟡               │  │
│  │  🟢                           │  │
│  │                    🔴         │  │
│  │    ┌──────────────┐          │  │
│  │    │ 🛑 Pothole    │          │  │  ← callout popup
│  │    │ High Severity │          │  │
│  │    │ [Verified]    │          │  │
│  │    └──────────────┘          │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                    │
│         ┌──────────┐              │
│         │  List  Map │              │  ← mode toggle
│         └──────────┘              │
└────────────────────────────────────┘
```

**Marker Clustering:**
- < 10 issues: individual markers
- 10-50: cluster with count badge
- > 50: cluster with zoom-to-bounds behavior

**Callout on Marker Tap:**
```
┌──────────────────────┐
│ ┌──┐ Title (1 line) │
│ │img│ Category      │
│ └──┘ Severity badge │
│     Status badge     │
│     Tap for details >│
└──────────────────────┘
```

**User Location:**
- Blue dot at user's location
- "My Location" button bottom-right (re-center)

**States:**
- Loading: spinner overlay
- No location permission: show city-level default, banner: "Enable location for nearby issues"
- Empty map: "No issues in this area"

---

## S06 — Issue Detail

```
┌────────────────────────────────────┐
│  ← Back              [⋮ Share]     │
├────────────────────────────────────┤
│ ┌──────────────────────────────┐  │  ← Image Gallery
│ │                              │  │
│ │          (image)             │  │
│ │                              │  │
│ └──────────────────────────────┘  │
│ ● ● ○ ○                  2 of 4  │  ← dot indicators
│                                    │
│ [Pothole] [High] [Verified]       │  ← badges row
│                                    │
│ Large Pothole on MG Road          │  ← Title (H1)
│                                    │
│ About 1 foot wide, causing        │  ← Description (Body)
│ vehicles to swerve near HDFC ATM.  │
│                                    │
│ 📍 MG Road, Bangalore             │  ← Location
│ ┌──────────────────────────────┐  │
│ │      (static map thumbnail)  │  │
│ └──────────────────────────────┘  │
│                                    │
│ ─── AI Analysis ───               │  ← collapsible section
│ 🤖 AI Summary:                    │
│ "Deep pothole ~30cm wide"         │
│ 🎯 Confidence: ████████░░ 94%    │
│ 📦 Category: Pothole (AI)        │
│ 🏢 Assigned to: Roads Dept       │
│                                    │
│ ─── Reporter ───                  │
│ [Avatar] Rajan Mehta              │
│ 🏆 Hero Score: 250                │
│                                    │
│ ─── Verification ───              │
│ ┌──────────────────────────┐      │
│ │  [✅ Verified (5)]       │      │  ← toggle button
│ │  5 neighbors confirmed   │      │
│ └──────────────────────────┘      │
│                                    │
│ ─── Timeline ───                   │
│ ● Pending              10:30 AM   │
│ ● AI Processed         10:32 AM   │
│ ● 5 Verifications!     10:45 AM   │
│ ● Assigned to Roads    11:00 AM   │
│ ● In Progress          11:30 AM   │
│                                    │
│ (dept admin actions shown here)    │
└────────────────────────────────────┘
```

**Dept Admin Actions (shown at bottom):**
```
┌──────────────────────────────┐
│  [Change Status ▼] [Add Note] │
└──────────────────────────────┘
```

**Status Change Bottom Sheet (dept admin):**
```
┌──────────────────────────────────┐
│ ─── Change Status                │
│ Current: In Progress             │
│                                  │
│ What's the new status?           │
│ ○ Assigned  ○ In Progress        │
│ ● Resolved  ○ Rejected          │
│                                  │
│ Note (optional):                 │
│ ┌──────────────────────────┐    │
│ │ Crew dispatched at 10:30 │    │
│ │ Filled the pothole with  │    │
│ │ fresh asphalt.           │    │
│ └──────────────────────────┘    │
│                                  │
│         [Confirm Change]         │
└──────────────────────────────────┘
```

**States:**
- Loading: full-page shimmer skeleton
- Error: "Could not load issue" + Retry
- Deleted: "This issue has been removed" (ghost state)
- AI pending: "AI is analyzing..." banner at top

---

## S07 — Report Issue (Multi-Step)

### Step 1: Capture Media

```
┌────────────────────────────────────┐
│  ← Back           Step 1 of 3      │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │     📸 Camera Viewfinder     │  │
│  │                              │  │
│  │                              │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐             │
│  │img│ │img│ │ + │ │  │            │  ← thumbnail strip
│  └──┘ └──┘ └──┘ └──┘            │
│                                    │
│  [🖼️ Gallery]  [⏺ Capture]  [🔄 Flip]
│                                    │
│          [Continue →]              │
└────────────────────────────────────┘
```

**Behavior:**
- Long-press capture → video mode (max 15s)
- Gallery pick → multi-select (max 5)
- Tap thumbnail → preview/delete
- "Continue" disabled until at least 1 image

### Step 2: Location

```
┌────────────────────────────────────┐
│  ← Back           Step 2 of 3      │
├────────────────────────────────────┤
│  ┌──────────────────────────────┐  │
│  │                              │  │
│  │     📍 Map with draggable    │  │
│  │        pin at center         │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                    │
│  Pin Location                      │
│  MG Road, Bangalore                │
│  12.9716, 77.5946                  │
│                                    │
│  [📍 Use My Location]              │
│                                    │
│          [Continue →]              │
└────────────────────────────────────┘
```

### Step 3: Details

```
┌────────────────────────────────────┐
│  ← Back           Step 3 of 3      │
├────────────────────────────────────┤
│  Category                          │
│  ┌──────────────────────────────┐  │
│  │ [Pothole]         ▼         │  │  ← picker
│  └──────────────────────────────┘  │
│                                    │
│  Severity                          │
│  [ Low ] [ Medium ] [ High ] [ Critical ]
│                                    │
│  Title                             │
│  ┌──────────────────────────────┐  │
│  │ Large pothole on MG Road     │  │
│  └──────────────────────────────┘  │
│                                     │
│  Description (optional)             │
│  ┌──────────────────────────────┐  │
│  │ About 1 foot wide...   245   │  │  ← char counter
│  └──────────────────────────────┘  │
│                                    │
│  Ward (optional)                   │
│  ┌──────────────────────────────┐  │
│  │ Shivajinagar                 │  │
│  └──────────────────────────────┘  │
│                                    │
│       [📤 Submit Report]           │
└────────────────────────────────────┘
```

**States:**
- Form validation: inline errors per field
- Uploading: "Uploading media... (2/5)" progress overlay
- Submitting: "Creating your report..." overlay
- Success: navigate to issue detail
- Error: "Upload failed. Retry?" toast

---

## S08 — Notifications

```
┌────────────────────────────────────┐
│ 🔔 Notifications    [Mark All Read]│
├────────────────────────────────────┤
│ Today                              │
│ ┌──────────────────────────────┐  │
│ │ ✅ Issue Resolved             │  │
│ │ Your pothole report on MG    │  │  ← bold = unread
│ │ Road has been resolved.      │  │
│ │ ⏰ 2h ago                    │  │
│ └──────────────────────────────┘  │
│ ┌──────────────────────────────┐  │
│ │ 🏅 Badge Earned!             │  │
│ │ You earned "Neighborhood     │  │
│ │ Watch" badge!                │  │
│ │ ⏰ 5h ago                    │  │
│ └──────────────────────────────┘  │
│ ┌──────────────────────────────┐  │
│ │ 👥 5 Verifications!          │  │  ← unread (colored bg)
│ │ Your water leak report has   │  │
│ │ reached 5 verifications!     │  │
│ │ ⏰ 1d ago                    │  │
│ └──────────────────────────────┘  │
│                                    │
│ Yesterday                          │
│ ┌──────────────────────────────┐  │
│ │ 🔄 Issue Assigned            │  │
│ │ Your report has been         │  │
│ │ assigned to Roads Dept.      │  │
│ │ ⏰ 1d ago                    │  │
│ └──────────────────────────────┘  │
└────────────────────────────────────┘
```

**Notification Types Visual:**
| Type | Icon | Left Border |
|---|---|---|
| issue_verified | ✅ shield-check | Green |
| issue_assigned | 🔄 account-hard-hat | Amber |
| issue_updated | ℹ️ information | Blue |
| issue_resolved | ✅ checkmark-circle | Green |
| verification_milestone | 👥 account-group | Purple |
| badge_earned | 🏅 trophy | Gold |

**States:**
- Empty: "No notifications yet" with bell illustration
- Loading: 3 skeleton rows
- Pull-to-refresh
- Swipe to dismiss (mark read)
- Tab badge: unread count

---

## S09 — Profile

```
┌────────────────────────────────────┐
│          Profile           [⚙️]   │
├────────────────────────────────────┤
│                                    │
│       [Avatar (64px)]              │
│        Rajan Mehta                 │
│        🏆 Hero Score: 250         │
│        [Citizen]                   │  ← role badge
│                                    │
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │  12  │ │   8  │ │  30  │       │
│ │Reports│ │Resolv'd│ │Verif'd│    │
│ └──────┘ └──────┘ └──────┘       │
│                                    │
│ ─── Badges ───                    │
│ ┌──────────────────────────────┐  │
│ │ 🏅 First Responder           │  │
│ │ Reported your first issue    │  │
│ │ Earned Jan 15, 2025          │  │
│ └──────────────────────────────┘  │
│ ┌──────────────────────────────┐  │
│ │ 🏅 Neighborhood Watch        │  │  ← locked (gray)
│ │ Report 10 issues             │  │
│ │ ████████░░░░ 8/10           │  │  ← progress bar
│ └──────────────────────────────┘  │
│                                    │
│ ─── Menu ───                      │
│ 📋 My Reports         >            │
│ 🏆 Leaderboard        >            │
│ 🔔 Notification Settings >        │
│ 📞 Contact Support    >            │
│ ℹ️ About              >            │
│                                    │
│         [Sign Out]                 │
└────────────────────────────────────┘
```

**States:**
- Loading: skeleton
- Edit mode: fields become editable, avatar tappable
- Sign out: confirmation dialog → clear session → navigate to auth

---

## S10 — Leaderboard

```
┌────────────────────────────────────┐
│ 🏆 Leaderboard                   │
│ [City ▼]              [This Month]│
├────────────────────────────────────┤
│  ┌──┐    ┌──┐    ┌──┐            │
│  │🥈│    │🥇│    │🥉│            │  ← podium
│  │890│   │1250│   │720│           │
│  │Amit│  │Priya│  │Sneha│         │
│  └──┘    └──┘    └──┘            │
│                                    │
│  #  │ Name            │ Score     │
│ ─────────────────────────────     │
│  4  │ [Avatar] Vikram │ 680       │
│  5  │ [Avatar] Neha   │ 650       │
│  6  │ [Avatar] Arun   │ 620       │
│  ▶ 7 │ [Avatar] You   │ 590       │  ← highlighted
│  8  │ [Avatar] Divya  │ 560       │
│  9  │ [Avatar] Karan  │ 530       │
│ 10  │ [Avatar] Meera  │ 500       │
│                                    │
│  ─────────────────────────────     │
│  Your Rank: #7 of 342 citizens    │
│  You're in the top 3%!            │
└────────────────────────────────────┘
```

**Period Tabs:** [Week] [Month] [All Time]

**States:**
- Loading: podium skeletons + 5 row skeletons
- Empty: "No data yet. Start reporting to climb the leaderboard!"
- Loading more: bottom spinner

---

## S11 — Admin Dashboard

```
┌────────────────────────────────────┐
│ 👋 Welcome, Suresh        [Roads ▼]│  ← dept selector
├────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌─────┐│
│ │  42  │ │  18  │ │  5   │ │ 67% ││
│ │ Total│ │ Open │ │In Prog│ │ Res ││
│ │Issues│ │      │ │      │ │ Rate││
│ └──────┘ └──────┘ └──────┘ └─────┘│
│                                    │
│ Critical Open: 2 ⚠️               │  ← red alert card
│                                    │
│ ─── Quick Actions ───              │
│ [Assign to Me] [Mark In Progress]  │
│ [Mark Resolved] [Add Note]         │
│                                    │
│ ─── Recent Issues ───              │
│ ┌──────────────────────────────┐  │
│ │ Pothole on MG Road           │  │
│ │ [In Progress] [High] ✅ 5    │  │
│ │ 3 days ago — Rajan M.       │  │
│ └──────────────────────────────┘  │
│ ┌──────────────────────────────┐  │
│ │ Water Leak, Indiranagar      │  │
│ │ [Assigned] [Critical] ✅ 12  │  │
│ │ 1 day ago — Priya S.        │  │
│ └──────────────────────────────┘  │
│                                    │
│     [View All Issues →]           │
└────────────────────────────────────┘
```

**States:**
- Loading: KPI card skeletons + issue row skeletons
- Empty: "No issues assigned yet"
- Realtime: new issue appears at top with fade-in animation

---

## S12 — Admin Issues Table

```
┌────────────────────────────────────┐
│  ← Dashboard     Issues (42)      │
├────────────────────────────────────┤
│ 🔍 Search issues...                │
│                                    │
│ Status: [All ▼]  Sort: [Newest ▼] │
│                                    │
│ ☐  │ Title              │ Sts  │ Sv
│ ───┼────────────────────┼──────┼───
│ ☑  │ Pothole MG Road    │ In P │ 🔴│
│ ☐  │ Water Leak Indiran │ Ass  │ 🟠│
│ ☑  │ Streetlight Koram  │ In P │ 🟡│
│ ☐  │ Garbage Bellandur  │ Ver  │ 🟢│
│ ☐  │ Road Damage JP Nag │ Ass  │ 🔴│
│ ☐  │ Sewage Whitefield  │ In P │ 🔴│
│                                    │
│ 3 of 42 selected          [Resolve]│
└────────────────────────────────────┘
```

**Full Columns (horizontal scroll):**
`☐ | Title | Status | Severity | Verifications | Age | Days Open | Dept | Reporter`

**Bulk Actions:**
- When 1+ selected: action bar appears at bottom
- "Resolve", "Assign", "Add Note" buttons

**States:**
- Loading: table skeleton
- Empty: "No issues match your filters"
- Selected: action bar visible

---

## S13 — Analytics

```
┌────────────────────────────────────┐
│ 📊 Analytics          [30 Days ▼]  │
├────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ 342  │ │ 67%  │ │ 48h  │       │
│ │ Total│ │Res.Rate│ │Avg T│       │
│ └──────┘ └──────┘ └──────┘       │
│                                    │
│ ─── Trends ───                    │
│  ┌────────────────────────────┐   │
│  │  ╱╲    ╱╲    ╱╲            │   │  ← line chart
│  │ ╱  ╲  ╱  ╲  ╱  ╲          │   │
│  │╱    ╲╱    ╲╱    ╲         │   │
│  └────────────────────────────┘   │
│  [Reported] [Resolved] [Verified] │  ← legend
│                                    │
│ ─── Hotspots ───                  │
│ ┌──────────────────────────────┐  │
│ │ 🔥 MG Road Junction          │  │
│ │ Risk: 87 • 4 pothole reports │  │
│ │ Predicted: +2 in 7 days     │  │
│ └──────────────────────────────┘  │
│ ┌──────────────────────────────┐  │
│ │ 🔥 Indiranagar Market        │  │
│ │ Risk: 72 • 3 garbage reports │  │
│ └──────────────────────────────┘  │
│                                    │
│ ─── Category Trends ───           │
│ Pothole         ▲ +23%    ████    │
│ Water Leak      ▼ -5%     ██     │
│ Garbage         ▲ +12%    ███     │
│ Streetlight     ▼ -8%     █      │
└────────────────────────────────────┘
```

**Charts:**
- Line chart: issues over time (reported, resolved, verified series)
- Bar chart: category distribution (optional tab)
- Heatmap: map overlay toggle (separate view)

**States:**
- Loading: chart skeletons + card skeletons
- Empty: "Not enough data for this period"
- Error per chart: individual retry buttons

---

## S14 — Edit Profile (Modal)

```
┌────────────────────────────────────┐
│ ─── Edit Profile                  │
│                                    │
│      [Avatar (80px)]              │  ← tappable
│      Tap to change photo          │
│                                    │
│   Full Name                        │
│   ┌──────────────────────────┐    │
│   │ Rajan Mehta              │    │
│   └──────────────────────────┘    │
│                                    │
│   Phone                            │
│   ┌──────────────────────────┐    │
│   │ +919876543210            │    │
│   └──────────────────────────┘    │
│                                    │
│         [Save Changes]             │
│                                    │
│         [Cancel]                   │
└────────────────────────────────────┘
```

---

## User Flows

### Flow 1: Report an Issue
```
Feed → Tap "+" → Capture Photo → Pick Location → Fill Details → Submit → Detail Screen
```

### Flow 2: Verify an Issue
```
Feed → Tap Issue → Scroll to Verification → Tap "Verify" → Count animates + Toast
```

### Flow 3: Admin Resolves Issue
```
Dashboard → Issues Table → Select Issue → Change Status → "Resolved" + Note → Confirm
```

### Flow 4: Notification Deep Link
```
Push arrives → Tap → App opens → Navigate to issue/[id] → Issue Detail
```

### Flow 5: Earn a Badge
```
User reports 10th issue → Score awarded → Badge check runs → Push notification →
Open app → Badge modal appears → Navigate to profile to view
```

---

## State Machine: Issue Lifecycle (Client View)

```
                    ┌──────────┐
                    │ Pending  │  ← Just submitted, awaiting AI
                    └────┬─────┘
                         │ AI processes
                    ┌────▼─────┐
                    │AI Process│  ← Categorized, awaiting verification
                    └────┬─────┘
                         │ 5+ verifications
                    ┌────▼─────┐
                    │ Verified │  ← Community confirmed
                    └────┬─────┘
                         │ Dept admin assigns
                    ┌────▼──────┐
                    │ Assigned  │  ← Dept takes responsibility
                    └────┬──────┘
                         │ Work started
                    ┌────▼─────────┐
                    │ In Progress  │  ← Being worked on
                    └────┬─────────┘
                         │ Work complete
                    ┌────▼──────┐
                    │ Resolved  │  ← Fixed! 🎉
                    └────┬──────┘
                         │ 7 days auto
                    ┌────▼──────┐
                    │  Closed   │
                    └───────────┘

Rejection paths:
Pending/AI Processed/Verified/Assigned → Rejected (spam/duplicate)
```

---

## Loading State Spec

| Screen | Loading | Empty | Error |
|---|---|---|---|
| Feed | 3 skeleton cards | Illustration + CTA | Toast + retry button |
| Map | Spinner overlay | "No issues here" | Alert banner |
| Detail | Full-page shimmer | "Issue not found" | Retry button |
| Notifications | 3 skeleton rows | Bell illustration | Toast |
| Leaderboard | Podium skeleton + 5 rows | "No data yet" | Toast |
| Dashboard | KPI skeletons + rows | "No issues" | Toast |
| Analytics | Chart skeletons | "Not enough data" | Per-chart retry |
| Report | N/A (form) | N/A | Upload error toast |
| Profile | Skeleton avatar + stats | N/A | Toast |

---

## Error Toast Spec

```
┌─────────────────────────────────────┐
│ ✕ Could not load issues            │
│                           [Retry]   │
└─────────────────────────────────────┘
```
- Auto-dismiss: 4s (or manual dismiss)
- With retry: stays until dismissed or retried
- Stacking: max 2 toasts visible

---

## Pull-to-Refresh Behavior
| Screen | Refresh Action |
|---|---|
| Feed | Refetch first page, reset pagination |
| Map | Refetch markers for current bounds |
| Notifications | Refetch notification list |
| Dashboard | Refetch all KPIs and lists |
| Analytics | Refetch all chart data |
| Leaderboard | Refetch rankings |

---

## Keyboard Behavior
- Feed search: dismiss on scroll
- Report form: "Next" advances field, "Done" dismisses
- Auth: "Return" on last field submits form
- Note input: grows with content (max 5 lines)
- All inputs: show done/return key type appropriately
