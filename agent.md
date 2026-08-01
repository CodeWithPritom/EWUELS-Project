# UELS — Agent Work Plan (Task List)

> **University Equipment Lending System**
> Each task is a small, focused unit of work. Complete in order. Check off when done.

---

## Phase 1: Foundation

### Task 1 — Project Initialization
- [ ] Run `npm init -y` in the project root
- [ ] Install production dependencies: `express`, `ejs`, `express-ejs-layouts`, `mysql2`, `express-session`, `express-mysql-session`, `bcrypt`, `dotenv`, `connect-flash`, `method-override`
- [ ] Install dev dependency: `nodemon`
- [ ] Add `"dev": "nodemon app.js"` to `package.json` scripts
- [ ] Create `.env.example` with all config keys
- [ ] Create `.env` from the example (gitignored)
- [ ] Create `.gitignore` (node_modules, .env)

### Task 2 — Database Setup & Portability
- [ ] Write `database.sql` — full schema with all 7 tables (`users`, `equipment_types`, `equipment_copies`, `requests`, `fines`, `audit_logs`, `settings`)
- [ ] Include `CREATE DATABASE IF NOT EXISTS uels_db;` at the top
- [ ] Include foreign key constraints on all relationship columns
- [ ] Include seed `INSERT` for default Admin account (pre-hashed bcrypt password)
- [ ] Include seed `INSERT` for default settings (`late_fine_rate_per_day = 50`, `late_fine_rate_per_minute = 1`)
- [ ] Write `setup.js` — automated script that reads `.env`, creates DB, runs all CREATE TABLE, seeds data
- [ ] Test: run `node setup.js` against a clean XAMPP MySQL instance and verify all tables created

### Task 3 — Express App Skeleton
- [ ] Create `app.js` — Express entry point
- [ ] Configure EJS as template engine with `express-ejs-layouts`
- [ ] Configure `express-session` with MySQL session store
- [ ] Configure `connect-flash` for flash messages
- [ ] Configure `method-override` for PUT/DELETE from forms
- [ ] Serve static files from `/public`
- [ ] Create `config/db.js` — MySQL connection pool using `mysql2/promise`
- [ ] Mount route files: `/auth`, `/student`, `/staff`, `/admin`
- [ ] Add a basic root route (`GET /` → redirect to login or dashboard based on session)
- [ ] Test: `npm run dev` starts without errors on http://localhost:3000

---

## Phase 2: Authentication & Authorization

### Task 4 — Auth Views (Login & Signup)
- [ ] Create `views/layouts/main.ejs` — master layout with Tailwind CDN, navbar placeholder, flash messages
- [ ] Create `views/auth/login.ejs` — email + password form
- [ ] Create `views/auth/signup.ejs` — name, email, password, role selector (Student or Faculty only)
- [ ] Style both pages with Tailwind — clean, modern, university-branded look
- [ ] Include flash message display partial (`views/partials/flash.ejs`)

### Task 5 — Auth Controller & Routes
- [ ] Create `routes/authRoutes.js` — `GET /login`, `GET /signup`, `POST /login`, `POST /signup`, `GET /logout`
- [ ] Create `controllers/authController.js`:
  - [ ] `signup`: validate inputs, check duplicate email, hash password with bcrypt, insert into `users` table, redirect to login
  - [ ] `login`: find user by email, compare password with bcrypt, set `req.session.user`, redirect based on role
  - [ ] `logout`: destroy session, redirect to login
- [ ] Create `models/User.js` — `findByEmail()`, `create()`, `findById()`, `updateStatus()`
- [ ] Test: sign up as Student, log in, verify session is created

### Task 6 — Middleware (Auth + Role + Block)
- [ ] Create `middlewares/authMiddleware.js` — check `req.session.user`, redirect if missing
- [ ] Create `middlewares/roleMiddleware.js` — `requireRole(...roles)` factory function
- [ ] Create `middlewares/blockCheckMiddleware.js` — if user is Blocked, redirect to blocked page (allow fine viewing)
- [ ] Apply `authMiddleware` to all protected routes
- [ ] Apply `roleMiddleware` to role-specific route groups
- [ ] Test: try accessing `/staff/dashboard` as Student — should get 403

---

## Phase 3: Equipment Management (Admin)

### Task 7 — Admin Dashboard
- [ ] Create `routes/adminRoutes.js` — protected with auth + role('Admin')
- [ ] Create `controllers/adminController.js` — dashboard method with overview stats
- [ ] Create `views/admin/dashboard.ejs` — stats cards (total equipment, active requests, active fines, blocked users)
- [ ] Query counts from DB for dashboard stats
- [ ] Test: login as Admin, see dashboard with stats

### Task 8 — Equipment Types CRUD (Admin)
- [ ] Create `models/EquipmentType.js` — `findAll()`, `findById()`, `create()`, `update()`, `delete()`
- [ ] Add admin controller methods: `listTypes`, `createType`, `updateType`, `deleteType`
- [ ] Create `views/admin/equipmentTypes.ejs` — table + add/edit form
- [ ] Include: name, category, description, image_url fields
- [ ] Test: CRUD operations on equipment types as Admin

### Task 9 — Equipment Copies Management (Admin)
- [ ] Create `models/EquipmentCopy.js` — `findByType()`, `findAll()`, `create()`, `updateStatus()`, `findAvailableByType()`
- [ ] Add admin controller methods: `listCopies`, `addCopy`, `updateCopyStatus`
- [ ] Create `views/admin/equipmentCopies.ejs` — table showing copies per type with status badges
- [ ] Unique code input (e.g., "LAP-001") with validation for uniqueness
- [ ] Test: add copies to a type, verify status shows "Available"

### Task 10 — Staff Account Creation (Admin)
- [ ] Add admin controller method: `createStaffAccount` — email, name, temp password
- [ ] Create `views/admin/staffAccounts.ejs` — form + list of existing staff
- [ ] Hash password with bcrypt before inserting
- [ ] Test: create a Staff account from Admin panel, login as that Staff

---

## Phase 4: Student/Faculty — Browse & Request

### Task 11 — Student Dashboard & Navigation
- [ ] Create `routes/studentRoutes.js` — protected with auth + role('Student', 'Faculty')
- [ ] Create `controllers/studentController.js` — dashboard method
- [ ] Create `views/student/dashboard.ejs` — welcome message, quick stats (active requests, pending fines)
- [ ] Create `views/partials/navbar.ejs` — role-aware navigation (show different links per role)
- [ ] Test: login as Student, see dashboard

### Task 12 — Browse Equipment Catalog
- [ ] Add student controller method: `browse` — list all equipment types with available copy count
- [ ] Create `views/student/browse.ejs` — card grid showing equipment name, category, image, available count
- [ ] Only show equipment types that have at least 1 `Available` copy
- [ ] Add "Request" button on each card (links to request form)
- [ ] Test: browse catalog, verify available counts match DB

### Task 13 — Submit Equipment Request
- [ ] Add student controller method: `submitRequest`
- [ ] Create `views/student/request.ejs` — form with purpose (textarea), duration type (Day/Minute radio), duration value (number input)
- [ ] Validation:
  - [ ] If Day → minimum 1 day
  - [ ] If Minute → minimum 20 minutes
  - [ ] Check that at least 1 copy is `Available` for the selected equipment type
  - [ ] Check that user is NOT blocked
  - [ ] Check that user has NO unpaid fines
- [ ] On submit: pick first `Available` copy → set copy to `Pending` → create request with status `Pending`
- [ ] Create `models/Request.js` — `create()`, `findByUserId()`, `findById()`, `updateStatus()`
- [ ] Flash success message and redirect to My Requests
- [ ] Test: submit request, verify copy status changes to Pending

### Task 14 — My Requests (History)
- [ ] Add student controller method: `myRequests` — list all requests for logged-in user
- [ ] Create `views/student/myRequests.ejs` — table with status, equipment name, dates, cancel button
- [ ] Show cancel button ONLY if:
  - Status = `Approved` (Reserved) AND within 5 minutes of `reserved_at`
- [ ] Color-code statuses (Pending=yellow, Approved=blue, Issued=green, Returned=gray, Cancelled=red)
- [ ] Test: view request history, see correct statuses

### Task 15 — Student Cancel Request (5-Minute Window)
- [ ] Add student controller method: `cancelRequest`
- [ ] **Server-side validation:** `NOW() - reserved_at <= 5 minutes`
- [ ] On cancel: request status → `Cancelled`, `cancelled_by` = `Student`, copy status → `Available`
- [ ] If past 5 minutes → reject with flash error "Cancel window has expired"
- [ ] Add a JavaScript countdown timer on the frontend for UX (not authoritative)
- [ ] Test: approve a request → cancel within 5 min (should work) → try after 5 min (should fail)

---

## Phase 5: Staff — Approve, Issue, Return

### Task 16 — Staff Dashboard & Pending Requests
- [ ] Create `routes/staffRoutes.js` — protected with auth + role('Staff')
- [ ] Create `controllers/staffController.js`
- [ ] Create `views/staff/dashboard.ejs` — overview (pending count, issued count, overdue count)
- [ ] Create `views/staff/pendingRequests.ejs` — list pending requests with Approve/Reject buttons
- [ ] Show student name, equipment, purpose, duration, requested_at
- [ ] Test: login as Staff, see pending requests

### Task 17 — Approve / Reject Request (Staff)
- [ ] Add staff controller methods: `approveRequest`, `rejectRequest`
- [ ] **Approve logic:**
  - [ ] Check student is not Blocked
  - [ ] Check student has no unpaid fines
  - [ ] Set request status → `Approved`, copy status → `Reserved`
  - [ ] Set `approved_at` = `reserved_at` = `NOW()`
  - [ ] Create audit log entry
- [ ] **Reject logic:**
  - [ ] Set request status → `Rejected`, copy status → `Available`
  - [ ] Create audit log entry
- [ ] Create `models/AuditLog.js` — `create()`, `findAll()`
- [ ] Test: approve a request → verify status & copy changes; reject another → verify

### Task 18 — Reserved List & Staff Cancel
- [ ] Create `views/staff/reservedList.ejs` — list all Reserved items with Issue & Cancel buttons
- [ ] Show time since reservation (for awareness)
- [ ] Add staff controller method: `staffCancel` — cancel any Reserved request (no time limit for Staff)
- [ ] On cancel: `cancelled_by` = `Staff`, request → `Cancelled`, copy → `Available`
- [ ] Test: cancel a reserved request as Staff

### Task 19 — Issue Equipment (Staff)
- [ ] Add staff controller method: `issueEquipment`
- [ ] When Staff clicks "Issue":
  - [ ] Request status → `Issued`
  - [ ] Copy status → `Issued`
  - [ ] `issued_at` = `NOW()`
  - [ ] `due_at` = `issued_at + duration_value` (days or minutes based on `duration_type`)
  - [ ] Create audit log entry
- [ ] Create `views/staff/issuedList.ejs` — list all currently Issued items
  - [ ] Show: student name, equipment, issued_at, due_at, remaining time / overdue indicator
  - [ ] Highlight overdue items in red
  - [ ] Add "Return" button
- [ ] Test: issue equipment → verify due_at calculation for both Day and Minute types

> ⚠️ **IMPORTANT:** `due_at` is computed here, NOT at approval time.

### Task 20 — Return Equipment (Staff) ⭐ CRITICAL TASK
- [ ] Create `views/staff/returnForm.ejs` — return form with:
  - [ ] Display: student info, equipment info, issued_at, due_at
  - [ ] Show overdue warning if applicable (with calculated fine preview)
  - [ ] Radio: condition = `Good` or `Damaged`
  - [ ] If `Damaged` selected → show number input for damage fine amount (manual)
  - [ ] Submit button "Process Return"
- [ ] Add staff controller method: `processReturn`
- [ ] Return logic:
  - [ ] Set `returned_at` = `NOW()`, `return_condition` = selected value
  - [ ] Request status → `Returned`
  - [ ] **If condition = Good:** copy status → `Available`
  - [ ] **If condition = Damaged:** copy status → `Maintenance`
  - [ ] Check for lateness and create late fine if applicable (see Task 21)
  - [ ] Check for damage and create damage fine if applicable (see Task 22)
  - [ ] If any fine created → auto-block student (see Task 23)
  - [ ] Create audit log entry
- [ ] Test: return equipment on-time good condition (no fine), overdue good condition (late fine), damaged (damage fine), overdue + damaged (both fines)

---

## Phase 6: Fine System ⭐ HIGHLIGHTED

### Task 21 — Late Fine Calculation ⭐ FINE LOGIC
- [ ] Create `utils/fineCalculator.js`:
  - [ ] `calculateLateFine(request, fineRatePerDay, fineRatePerMinute)`:
    - [ ] If `NOW() <= due_at` → return 0 (not overdue)
    - [ ] Calculate overdue duration
    - [ ] If `duration_type == 'Minute'`: overdue_minutes = `Math.ceil(diff_in_ms / 60000)`, fine = `overdue_minutes × ratePerMinute`
    - [ ] If `duration_type == 'Day'`: overdue_days = `Math.ceil(diff_in_ms / 86400000)`, fine = `overdue_days × ratePerDay`
    - [ ] **Rounding: ALWAYS Math.ceil (round UP).** 30 seconds → 1 minute. 2 hours → 1 day.
    - [ ] Return calculated amount
- [ ] Create `models/Fine.js` — `create()`, `findByUserId()`, `findByRequestId()`, `markPaid()`, `countUnpaidByUser()`
- [ ] Integrate into return flow (Task 20): if overdue → call `calculateLateFine()` → create fine record with `fine_type = 'Late'`
- [ ] Test with Minute mode: borrow for 20 min, return after 22 min → expect 2-minute late fine
- [ ] Test with Day mode: borrow for 1 day, return after 1.5 days → expect 1-day late fine (rounded up)

> ⚠️ **Rounding is critical.** The PDF specifically says: 30 seconds over → round to 1 minute. A few hours over → round to 1 day.

### Task 22 — Damage Fine ⭐ FINE LOGIC
- [ ] In the return form (Task 20), when `Damaged` is selected:
  - [ ] Staff enters a manual damage fine amount (repair cost — varies per item, so not auto-calculated)
  - [ ] On submit: create fine record with `fine_type = 'Damage'`, `amount` = entered value
- [ ] A single return can create **both** Late and Damage fines simultaneously
- [ ] Copy status set to `Maintenance` (not Available)
- [ ] Test: return a damaged item → verify damage fine created, copy goes to Maintenance

### Task 23 — Auto-Block on Fine Creation ⭐ BLOCK LOGIC
- [ ] Whenever a fine record is created (Late or Damage):
  - [ ] Set `users.account_status = 'Blocked'`
  - [ ] Set `users.block_type = 'Auto'`
  - [ ] Auto-cancel all user's `Pending` requests → copy → `Available`
  - [ ] Auto-cancel all user's `Reserved` requests → copy → `Available`
  - [ ] Each cancelled request: `cancelled_by = 'System'`
- [ ] Create a reusable helper: `blockUserAndCancelRequests(userId, blockType, reason, blockedBy)`
- [ ] Test: trigger a late fine → verify user is blocked and all pending/reserved requests are cancelled

### Task 24 — Fine Payment & Auto-Unblock ⭐ FINE LOGIC
- [ ] Create `views/staff/fineManagement.ejs` — list all unpaid fines (searchable by student)
- [ ] Show: student name, fine type, amount, request details, created_at
- [ ] Add "Mark as Paid" button for each fine
- [ ] Staff controller: `markFinePaid`:
  - [ ] Set `fine_status = 'Paid'`, `paid_at = NOW()`, `paid_confirmed_by = staff.id`
  - [ ] Check: are ALL fines for this user now paid? (`countUnpaidByUser()`)
  - [ ] **If yes AND `block_type = 'Auto'`:** auto-unblock user (set status to `Active`, clear block fields)
  - [ ] **If yes AND `block_type = 'Manual'`:** do NOT auto-unblock (manual blocks need manual unblock)
  - [ ] Create audit log entry
- [ ] Test: pay all fines for a blocked user → verify auto-unblock
- [ ] Test: manually blocked user with fines → pay fines → verify user stays blocked

> ⚠️ **Critical distinction:** Late fines paid → unblock only if `block_type = 'Auto'`. Manual blocks are NOT cleared by paying fines. Both Late AND Damage fines must be Paid before unblock.

---

## Phase 7: Block Management

### Task 25 — Manual Block / Unblock (Staff)
- [ ] Create `views/staff/blockManagement.ejs` — search user, view status, block/unblock buttons
- [ ] Staff controller: `manualBlock`:
  - [ ] Set `account_status = 'Blocked'`, `block_type = 'Manual'`, `block_reason` = input, `blocked_by` = staff.id
  - [ ] Cancel all Pending & Reserved requests (same helper from Task 23)
  - [ ] Create audit log entry
- [ ] Staff controller: `manualUnblock`:
  - [ ] Only allowed for Staff/Admin
  - [ ] Set `account_status = 'Active'`, clear block fields
  - [ ] Create audit log entry
- [ ] Test: manually block a user → verify requests cancelled; manually unblock → verify status Active

### Task 26 — Blocked User Experience (Student)
- [ ] Create `views/student/blocked.ejs` — info page showing:
  - [ ] "Your account is blocked" message
  - [ ] Block reason (if manual)
  - [ ] List of unpaid fines (if any)
  - [ ] Instruction to visit lab staff to pay fines
- [ ] `blockCheckMiddleware` redirects blocked students here
- [ ] But allow access to: My Requests (read-only), My Fines (read-only)
- [ ] Test: login as blocked student → redirected to blocked page → can view fines and history

---

## Phase 8: Fine Check Middleware (On-Demand) ⭐ HIGHLIGHTED

### Task 27 — Fine Check Middleware (No Cron Job) ⭐
- [ ] Create `middlewares/fineCheckMiddleware.js`:
  - [ ] Query: `SELECT * FROM requests WHERE user_id = ? AND status = 'Issued' AND due_at < NOW()`
  - [ ] For each overdue request:
    - [ ] Check if a `Late` fine already exists for this request (`findByRequestId`)
    - [ ] If no fine exists → calculate late fine → create fine record → auto-block user
  - [ ] This runs on **every page load** for Student/Faculty routes
- [ ] Apply to all student route handlers
- [ ] Also apply when Staff views the issued list (to update overdue status)
- [ ] Test: issue equipment with 1-minute duration → wait 2 minutes → load student dashboard → verify fine is auto-created and user is blocked

---

## Phase 9: Student Fine View

### Task 28 — My Fines Page (Student)
- [ ] Add student controller method: `myFines`
- [ ] Create `views/student/myFines.ejs` — table of all fines for the user
- [ ] Show: fine type (Late/Damage), amount, status (Unpaid/Paid), equipment info, date
- [ ] Color-code: Unpaid = red badge, Paid = green badge
- [ ] Note: Payment happens offline (student pays Staff in person). Staff marks as Paid from their panel.
- [ ] Test: view fines page as student with both paid and unpaid fines

---

## Phase 10: Admin — Settings, Audit Log, Maintenance

### Task 29 — Fine Rate Settings (Admin)
- [ ] Create `views/admin/fineSettings.ejs` — form to update fine rates
- [ ] Fields: `late_fine_rate_per_day`, `late_fine_rate_per_minute`
- [ ] Admin controller: `updateSettings` — update values in `settings` table
- [ ] Fine calculator reads these values from DB (not hardcoded)
- [ ] Test: change fine rate → trigger a new late fine → verify new rate applied

### Task 30 — Audit Log (Admin)
- [ ] Create `views/admin/auditLog.ejs` — paginated table of all audit log entries
- [ ] Show: actor name, action, target, details, timestamp
- [ ] Filter by action type (optional enhancement)
- [ ] Test: verify all major actions are logged (approve, reject, issue, return, block, unblock, fine, payment)

### Task 31 — Maintenance Management (Admin)
- [ ] Create `views/admin/maintenance.ejs` — list all copies with status `Maintenance`
- [ ] Show: equipment name, unique code, damage report (from return)
- [ ] Add "Mark as Repaired" button → sets copy status back to `Available`
- [ ] Create audit log entry
- [ ] Test: damaged return → copy in Maintenance → Admin marks repaired → copy Available

---

## Phase 11: UI Polish & Final Integration

### Task 32 — Navigation & Layout Polish
- [ ] Finalize `views/partials/navbar.ejs` — role-aware links, active page highlight, logout button
- [ ] Create `views/partials/footer.ejs` — copyright, university name
- [ ] Responsive design: ensure all pages work on mobile (Tailwind responsive classes)
- [ ] Consistent color scheme across all pages

### Task 33 — Error Handling & Edge Cases
- [ ] Add 404 page (`views/404.ejs`)
- [ ] Add 403 page (`views/403.ejs`)
- [ ] Add global error handler in `app.js`
- [ ] Handle: duplicate email on signup, invalid request IDs, equipment with no available copies
- [ ] Handle: concurrent requests for the same last available copy (check availability in transaction)
- [ ] Flash messages for all success/error operations

### Task 34 — Final Integration Testing
- [ ] **Full lifecycle test:** Student signs up → browses → requests → Staff approves → Staff issues → time passes → Staff returns (overdue) → late fine created → student blocked → student views blocked page → Staff marks fine paid → student auto-unblocked → student can request again
- [ ] **Damage test:** Same flow but with Damaged return → both Late + Damage fines → both must be paid to unblock
- [ ] **Manual block test:** Staff manually blocks user → requests cancelled → Staff manually unblocks
- [ ] **Cancel test:** Student cancels within 5 min → success; after 5 min → fail
- [ ] **Minute mode test:** Request with 20 min duration → issue → return after 22 min → 2-min late fine
- [ ] **Admin tests:** Add equipment types, add copies, create staff account, change fine rates, view audit log, repair maintenance items
- [ ] **Portability test:** Run `node setup.js` on a fresh XAMPP install → verify everything works

---

## Summary Table

| Phase | Tasks | Key Focus |
|-------|-------|-----------|
| 1. Foundation | 1–3 | npm, DB, Express skeleton |
| 2. Auth | 4–6 | Login, signup, middleware |
| 3. Equipment (Admin) | 7–10 | CRUD equipment, staff accounts |
| 4. Student Flow | 11–15 | Browse, request, cancel, history |
| 5. Staff Flow | 16–20 | Approve, issue, return |
| 6. Fine System ⭐ | 21–24 | Late fine, damage fine, auto-block, payment |
| 7. Block Mgmt | 25–26 | Manual block/unblock, blocked UX |
| 8. Fine Middleware ⭐ | 27 | On-demand fine check (no cron) |
| 9. Student Fines | 28 | Fine viewing page |
| 10. Admin Extras | 29–31 | Settings, audit log, maintenance |
| 11. Polish | 32–34 | UI, error handling, integration tests |

---

> ⭐ = Highlighted tasks related to **Fine/Block logic** as requested.
> Do NOT start coding until this plan is approved.
