# PRD-03: Issue Reporting

## Overview
The core citizen interaction — report a civic issue with photos/video, location, category, and description. Supports offline-capable image capture, real-time location picking on a map, and AI feedback after submission.

---

## Screen: Report Issue (`(tabs)/report.tsx`)

### Flow Overview
```
1. Media Capture ──▶ 2. Location Picker ──▶ 3. Details Form ──▶ 4. Review & Submit
```

---

### Step 1: Media Capture

**UI:**
- Camera viewfinder (full-width, aspect ratio 4:3)
- Gallery button (bottom-left) to pick from library
- Capture button (center)
- Flip camera button (bottom-right)
- Preview strip of captured images below (horizontal scroll)

**Behavior:**
- Tap to capture photo (uses `expo-camera`)
- Long-press to record video (max 15s, MP4)
- Tap gallery icon → `expo-image-picker` (multiple select, max 5 images)
- Show thumbnail previews with delete (X) button
- Max 5 images OR 1 video (not both)

**Image Processing (client-side before upload):**
```typescript
async function processImage(uri: string): Promise<string> {
  // 1. Resize to max 1920px (longest edge)
  // 2. Convert to WEBP (quality 0.8)
  // 3. Return local file path for upload
}
```

---

### Step 2: Location Picker

**UI:**
- Map view (react-native-maps) centered on user's current location
- Draggable pin at center
- "Use My Location" button (snaps pin to current GPS)
- Search bar (optional: Google Places autocomplete)
- Address display below map (reverse geocoded)

**Behavior:**
- On mount: request location permission, center map on current location
- User drags map → pin stays centered, address updates
- Confirm button → stores `{latitude, longitude, address}`
- Fallback: if location permission denied, show manual address text input

**Validation:**
- Location is required (cannot proceed without it)
- Coordinates must be within valid range

---

### Step 3: Details Form

**Fields:**
| Field | Component | Validation |
|---|---|---|
| Category | Picker (scroll wheel or bottom sheet) | Required, valid enum |
| Severity | Segmented control (Low / Medium / High / Critical) | Required |
| Title | TextInput (multiline: false) | Required, 5-100 chars |
| Description | TextInput (multiline: true) | Optional, max 1000 chars |
| Ward | TextInput (optional) | Auto-filled from location if available |

**Category Picker Options:**
```
Pothole, Road Damage, Water Leak, Sewage,
Streetlight, Garbage, Illegal Dumping,
Fallen Tree, Park Damage, Other
```

**Severity Pick:**
- Low (green) — minor cosmetic
- Medium (amber) — moderate inconvenience
- High (orange) — significant problem
- Critical (red) — immediate safety hazard

**Behavior:**
- Category and severity show colored icons matching the issue type
- Character counter on description (1000 max)
- "Report" button at bottom (disabled until valid)

---

### Step 4: Review & Submit

**Review Screen Elements:**
- Full-size preview of first image (swipeable gallery)
- Category + severity badges
- Title and description
- Location address with map thumbnail
- Edit button (goes back to form)

**Submission Flow:**
1. User taps "Submit Report"
2. Show loading overlay with message: "Uploading media..."
3. Upload media to Supabase Storage via signed URL pre-auth
4. Create issue via `POST /issues` with returned storage paths
5. On success: navigate to issue detail screen
6. On error: show retry toast

**Post-Submission:**
- AI processing happens asynchronously
- Status shows "pending" initially, updates in realtime via Supabase Realtime
- Show "AI is analyzing your report..." banner on detail screen
- Push notification arrives when AI finishes

---

## API Integration

### Media Upload (`POST /issues/upload-media`)
```typescript
const formData = new FormData()
formData.append('files[]', { uri, type: 'image/webp', name: 'photo.webp' })
formData.append('issue_temp_id', tempId)

const { data } = await supabase.functions.invoke('upload-media', {
  body: formData,
})
```

### Create Issue (`POST /issues`)
```typescript
const { data } = await supabase.functions.invoke('issues', {
  method: 'POST',
  body: {
    title,
    description,
    category,
    severity,
    latitude,
    longitude,
    address,
    image_urls: uploadedPaths,
    video_url: null,
  },
})
```

---

## Rate Limiting UX
- Show remaining reports today in form footer: "You can submit 8 more reports today"
- If rate limited: disable submit, show message: "Daily limit reached. Come back tomorrow."

---

## Offline Handling
- Media capture and form data cached locally if no network
- Queue submission when connectivity restored (expo-network listener)
- Show offline indicator banner

---

## Accessibility
- All touch targets min 44x44dp
- Image descriptions for screen readers
- High contrast mode for severity colors
- Form field labels announced by screen reader

---

## Acceptance Criteria
- [ ] Capture photo from camera and preview before upload
- [ ] Pick multiple images from gallery (max 5)
- [ ] Location pin is draggable and updates address
- [ ] All form fields validate before submit
- [ ] Media uploads succeed and return storage paths
- [ ] Issue creation succeeds and navigates to detail
- [ ] Rate limit message shows remaining submissions
- [ ] Offline mode queues submission for later
