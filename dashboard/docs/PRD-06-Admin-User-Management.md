# PRD-06: Admin & User Management

## Overview
Super admin panel for managing users, creating department admin accounts, and configuring departments. Only accessible by users with `super_admin` role.

---

## Routes
```
/dashboard/admin/users         → User list & management
/dashboard/admin/departments   → Department list & configuration
```

---

## User Management (`/dashboard/admin/users`)

### Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ User Management                          [+ Invite Admin]    │
│                                                                │
│ [🔍 Search users...      ]  [Filter: All ▼]                   │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ User              │ Role          │ Dept       │ Status    │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 👤 Rajan Mehta     │ Citizen       │ —          │ Active    │ │
│ │ 👤 Suresh Kumar    │ Dept Admin    │ Roads      │ Active    │ │
│ │ 👤 Priya Sharma    │ Super Admin   │ —          │ Active    │ │
│ │ 👤 Anil Singh      │ Dept Admin    │ Water      │ Disabled  │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                │
│  Showing 1-25 of 48    ◀ 1 2 ▶                                │
└──────────────────────────────────────────────────────────────────┘
```

### Columns

| Column | Description |
|---|---|
| User | Avatar + name + email |
| Role | Badge: Citizen (gray), Dept Admin (blue), Super Admin (purple) |
| Department | Department name (if dept admin) |
| Hero Score | For citizens (displays as number) |
| Reports | Total reports submitted |
| Resolved | Issues resolved |
| Joined | Date joined |
| Status | Active (green) / Disabled (red) badge |
| Actions | ⋮ menu: [Edit] [Toggle Status] [Delete] |

### Actions per Row

| Action | Behavior |
|---|---|
| Edit | Opens slide-over panel with editable fields (name, email, role, department) |
| Toggle Status | Confirmation dialog → enable/disable account |
| Delete | Confirmation dialog → soft delete profile |

### Bulk Actions
- Select multiple users → [Disable] [Enable] [Delete] (bottom bar)

---

## Invite Admin Flow

Triggered by clicking "+ Invite Admin" button.

### Modal: Invite Department Admin

```
┌──────────────────────────────────────────────┐
│ Invite Department Admin                       │
│                                               │
│ Email *                                       │
│ ┌──────────────────────────────────────────┐ │
│ │ s.kumar@city.gov                         │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ Full Name *                                   │
│ ┌──────────────────────────────────────────┐ │
│ │ Suresh Kumar                             │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ Department *                                  │
│ ┌──────────────────────────────────────────┐ │
│ │ Roads & Infrastructure        ▼          │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│          [Cancel]    [Send Invite]            │
└──────────────────────────────────────────────┘
```

### Logic
1. Validate: email format, name non-empty, department selected
2. Call `POST /admin/create-dept-admin` backend endpoint
3. Endpoint creates auth user with magic link + sets profile role
4. On success: toast "Invitation sent to s.kumar@city.gov"
5. On error: inline error in modal

### States

| State | Behavior |
|---|---|
| Default | Empty form, "Send Invite" button disabled |
| Filled | Button enabled, all fields validated |
| Submitting | Button shows spinner, fields disabled |
| Success | Toast, modal closes, table refreshes |
| Error | Inline error in modal |

---

## Department Configuration (`/dashboard/admin/departments`)

### Page Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Departments                               [+ Add Department]  │
│                                                                │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Department       │ Slug    │ Admins │ Issues  │ Contact    │ │
│ ├────────────────────────────────────────────────────────────┤ │
│ │ 🏗️ Roads & Infra│ roads   │ 2      │ 98      │ roads@…   │ │
│ │ 💧 Water & Sewage│ water   │ 1      │ 45      │ water@…   │ │
│ │ ⚡ Electricity   │ elect…  │ 1      │ 54      │ elect…@…  │ │
│ │ 🗑️ Waste Mgmt   │ waste   │ 0      │ 76      │ waste@…   │ │
│ │ 🌳 Parks & Rec   │ parks   │ 0      │ 23      │ parks@…   │ │
│ └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### Edit Department Modal

```
┌──────────────────────────────────────────────┐
│ Edit Department: Roads & Infrastructure      │
│                                               │
│ Name *                                        │
│ ┌──────────────────────────────────────────┐ │
│ │ Roads & Infrastructure                   │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ Slug                                          │
│ roads                                         │
│                                               │
│ Contact Email                                 │
│ ┌──────────────────────────────────────────┐ │
│ │ roads@city.gov                           │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ Contact Phone                                 │
│ ┌──────────────────────────────────────────┐ │
│ │ +91-1234567890                           │ │
│ └──────────────────────────────────────────┘ │
│                                               │
│ Status: [Active] (toggle)                     │
│                                               │
│       [Cancel]    [Save Changes]              │
└──────────────────────────────────────────────┘
```

### Add Department Modal
Same fields as edit, but empty and "Create Department" button.

---

## Data Fetching

### Users List
**Fetch:** `GET /admin/users` (backend — returns paginated list of profiles with roles)

### Department List
**Fetch:** `GET /departments` (backend — public list of departments)

---

## Role Change Logic

When super admin changes a user's role:
1. If changing citizen → department_admin: must select a department
2. If changing department_admin → citizen: department_id set to null
3. If changing to super_admin: no department needed
4. Audit log entry created server-side

---

## Acceptance Criteria
- [ ] User table loads with correct pagination and search
- [ ] Role filter: all / citizen / department_admin / super_admin
- [ ] Invite Admin: validates fields, calls API, shows success toast
- [ ] Invite Admin: error handling (invalid email, duplicatate)
- [ ] Toggle user status: confirmation → updates profile → shows new badge
- [ ] Edit user: slide-over panel, pre-filled, saves correctly
- [ ] Delete user: confirmation → soft delete → removed from table
- [ ] Department table shows correct admin count (query from profiles)
- [ ] Edit department: updates name, contact info, active status
- [ ] Add department: creates new department with slug
- [ ] Role change enforces department selection for dept_admin
- [ ] Only super_admin can access these pages (middleware + server guard)
- [ ] Non-super_admin redirected if they navigate directly
