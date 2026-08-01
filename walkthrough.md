# UELS — QA Verification & Walkthrough

This document records the automated integration testing and manual browser verification results for the **University Equipment Lending System (UELS)**.

## 🤖 Automated Integration Testing

The system's complete business logic lifecycle has been fully simulated and verified via `qa_test.js`.

### Test Log Output
```
🧪 Starting Lead QA Integration Tests...

🧹 Cleaning up old QA test data...
  ✓ Cleanup finished.

▶️ TEST 1: Student Signup and Login Simulation
  ✓ Student signed up with ID: 2
  ✓ Student login simulation passed (correct credentials verified)
  ✓ Staff user created with ID: 3

▶️ TEST 2: Equipment Request & Immediate Copy Locking
  ✓ Test Equipment Type ID: 1, Copy Code: QA-LAP-01 (ID: 1)
  ✓ Request ID 1 submitted. Copy locked to "Pending" successfully.

▶️ TEST 3: Staff Approval & Copy Reservation
  ✓ Staff checks passed. Reservation status set to "Reserved" successfully.

▶️ TEST 4: Equipment Issuing & due_at Timestamp Calculation
  ✓ Equipment issued. due_at timestamp calculated correctly.

▶️ TEST 5: Late Return, Fine Incurrence, & Auto-Blocking
  ✓ Item returned overdue. Unpaid fine of ৳16 created.
  ✓ Student auto-blocked with block type "Auto".

▶️ TEST 6: Fine Payment & Auto-Unblocking
  ✓ Fine paid successfully. Student automatically unblocked.
  ✓ Block status cleared to null.

✅ ALL QA INTEGRATION TESTS PASSED SUCCESSFULLY!
```

---

## 🖥️ Manual Browser Verification (Admin Panel)

Below are the screenshots captured during manual browser verification, demonstrating the correct rendering of Admin views and system components.

### 1. Login Page (`/auth/login`)
A clean, academic login card with secure input validation.
![Login Page](file:///C:/Users/User/.gemini/antigravity-ide/brain/479acb0a-6fc3-4bc8-ab5a-f647eac75d9d/login_page_1785296153725.png)

### 2. Admin Dashboard (`/admin/dashboard`)
Displays real-time stats queried from the database.
![Admin Dashboard](file:///C:/Users/User/.gemini/antigravity-ide/brain/479acb0a-6fc3-4bc8-ab5a-f647eac75d9d/admin_dashboard_1785296181422.png)

### 3. Staff Accounts Management (`/admin/staff-accounts`)
Create lab staff and view active accounts.
![Staff Accounts](file:///C:/Users/User/.gemini/antigravity-ide/brain/479acb0a-6fc3-4bc8-ab5a-f647eac75d9d/admin_staff_accounts_1785296197424.png)

### 4. Equipment Types CRUD (`/admin/equipment-types`)
Inline add/edit form for managing hardware models.
![Equipment Types](file:///C:/Users/User/.gemini/antigravity-ide/brain/479acb0a-6fc3-4bc8-ab5a-f647eac75d9d/admin_equipment_types_1785296213278.png)

### 5. Equipment Copies Tracker (`/admin/equipment-copies`)
Unique unit inventory mapping with color-coded status badges.
![Equipment Copies](file:///C:/Users/User/.gemini/antigravity-ide/brain/479acb0a-6fc3-4bc8-ab5a-f647eac75d9d/admin_equipment_copies_1785296226455.png)

### 6. Fine Settings Configurator (`/admin/fine-settings`)
Forms to adjust day-based and minute-based late rates dynamically.
![Fine Settings](file:///C:/Users/User/.gemini/antigravity-ide/brain/479acb0a-6fc3-4bc8-ab5a-f647eac75d9d/admin_fine_settings_1785296242176.png)

### 7. Custom 404 Error View
Graces the user with redirect capabilities when hitting an invalid route.
![Custom 404](file:///C:/Users/User/.gemini/antigravity-ide/brain/479acb0a-6fc3-4bc8-ab5a-f647eac75d9d/custom_404_page_1785296286373.png)

---

## 🎥 Browser Actions Session Recording
You can watch the full recorded session of the manual QA checks here:
[manual_browser_test.webp](file:///C:/Users/User/.gemini/antigravity-ide/brain/479acb0a-6fc3-4bc8-ab5a-f647eac75d9d/manual_browser_test_1785295864952.webp)
