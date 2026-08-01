# University Equipment Lending System (UELS)

UELS is a web-based management platform designed to automate and simplify the process of borrowing lab hardware and equipment (such as laptops, projectors, camera gears, and microcontrollers) within a university environment. The application is built using the Model-View-Controller (MVC) architectural pattern.

## Tech Stack
- **Core**: Node.js & Express.js
- **Frontend Template Engine**: EJS with Tailwind CSS (via CDN)
- **Database**: MySQL/MariaDB (configured for XAMPP default settings)
- **Authentication & Security**: Session-based auth with `express-session`, `express-mysql-session`, and `bcrypt` password hashing

---

## Installation & Setup

Follow these steps to deploy and run the project locally on your machine.

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [XAMPP](https://www.apachefriends.org/) (with Apache & MySQL modules running)

### 2. Clone or Copy Files
Navigate to the project root directory:
```bash
cd e:\Websites\UELS
```

### 3. Install NPM Dependencies
Run the install command to configure all development and production modules:
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root of the project (if not already present). Refer to `.env.example` for details:
```env
# Database Credentials
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=uels_db

# Session Secret Key
SESSION_SECRET=super_secret_session_key_123

# Admin Seed Account
ADMIN_NAME=System Admin
ADMIN_EMAIL=admin@uels.edu
ADMIN_PASSWORD=admin123

# Default Fine Rates (৳)
DEFAULT_FINE_RATE_PER_DAY=50
DEFAULT_FINE_RATE_PER_MINUTE=1
```

### 5. Initialize the Database
Make sure XAMPP MySQL is active. Run the automated database setup script:
```bash
node setup.js
```
*What this does:* Connects to your local MySQL instance, creates the database `uels_db` if it does not exist, registers the table structures, seeds the default fine rates, and inserts the default administrator account.

### 6. Run the Project
Start the development server using `nodemon`:
```bash
npm run dev
```
Open your browser and visit: **[http://localhost:3000](http://localhost:3000)**

---

## Default Administrator Credentials
Use the seeded administrator account to configure settings, add equipment, and create staff credentials:
- **Email**: `admin@uels.edu`
- **Password**: `admin123`

---

## Role-Based Overview

### 👤 Student / Faculty
- **Self-Registration**: Can sign up themselves directly from the Signup portal.
- **Browse Catalog**: Inspect available equipment categories and check live item counts.
- **Requests**: Submit borrow requests with duration types (Days/Minutes).
- **Cancel Window**: Can cancel any approved reservation within a 5-minute cooldown period.
- **My Fines & History**: Read-only tracking of active borrowings and outstanding balances.

### 💼 Lab Staff
- **Approve / Reject**: Manage the pending request queue (validates student blocks and fines before allowing checkout).
- **Issue Equipment**: Hand over items to students (calculates the due date/time and starts the timer).
- **Process Returns**: Inspect item conditions (Good/Damaged), calculate overdue durations, calculate fine fees, and auto-block overdue borrowers.
- **Fine Management**: Confirm in-person payments to mark fines as Paid (auto-unblocks students if blocked type is `Auto`).
- **Block Management**: Manually block students for policy violations (requires reason notes).

### ⚙️ System Administrator
- **Equipment CRUD**: Create, edit, and delete equipment categories.
- **Manage Copies**: Track physical unit statuses (`Available`, `Pending`, `Reserved`, `Issued`, `Maintenance`) and register new codes (e.g. `LAP-001`).
- **Staff Accounts**: Register credentials for lab staff assistants.
- **Fine Rate Configuration**: Modify rates for late minutes/days dynamically from the UI.
- **Maintenance**: Review damaged items in repair and return them back to `Available` status.
- **Audit Logs**: View timestamped actions performed across the entire system.

---

## QA Testing
To verify database structure, constraints, late returns, and automated unblock logic, run the test script:
```bash
node qa_test.js
```

---

## 🔌 Offline / Demo Mode (Database Fallback)

UELS includes a built-in **fallback system**. If MySQL is unavailable (e.g., XAMPP not running), the application automatically switches to **Demo Mode**, reading data from the local file:

```
/data/seed_data.json
```

### What works in Demo Mode
- ✅ Full website navigation
- ✅ Login for all roles (Admin, Staff, Student, Faculty)
- ✅ Admin Dashboard with live statistics from JSON
- ✅ Equipment Types & Copies listing
- ✅ Requests, Fines, and Audit Log views
- ✅ Fine Rate settings (in-memory for session)
- ✅ Student Catalog browsing

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@uels.edu` | `admin123` |
| **Staff** | `rahim.staff@uels.edu` | `staff123` |
| **Student** (Active) | `arif.student@uels.edu` | `student123` |
| **Student** (Blocked) | `nadia.student@uels.edu` | `nadia123` |
| **Faculty** | `karim.faculty@uels.edu` | `faculty123` |

### Limitations in Demo Mode
- ⚠️ All writes (new equipment, approvals, etc.) are **in-memory only** — data resets on server restart
- ⚠️ Session-based authentication still works but new signups won't persist

### Architecture
The fallback system is implemented in three key files:
- **`config/db.js`** — Tests DB on startup; exports `isAvailable()` flag
- **`config/fallback.js`** — In-memory data store loaded from `seed_data.json`
- **`models/*.js`** — Every model tries DB first, silently falls back on error
