# EWU Equipment Lending System (EWU ELS)

EWU ELS is a web-based management platform designed to automate and simplify the process of borrowing lab hardware and equipment (such as laptops, projectors, camera gears, and microcontrollers) for **East West University (EWU)**. Built using the Model-View-Controller (MVC) architectural pattern.

---

## 🔑 Quick Demo Credentials (Test Accounts)

You can instantly log in and test all user roles (Admin, Staff, Student, Faculty) using these seeded test credentials (works in both Database Mode and Offline Demo Mode):

| Role | Email Address | Password | Account Status / Access |
| :--- | :--- | :--- | :--- |
| 👑 **System Admin** | `admin@uels.edu` | `admin123` | Full system control, photo upload, audit logs |
| 👮 **Lab Staff** | `rahim.staff@uels.edu` | `staff123` | Approve, issue, return items, collect fines |
| 👨‍🎓 **Student (Active)** | `arif.student@uels.edu` | `student123` | Browse catalog, request items (min 2 mins) |
| 👨‍🎓 **Student (EWU Mail)** | `student@std.ewubd.edu` | `student123` | Official student email domain account |
| 🛑 **Student (Blocked)** | `nadia.student@uels.edu` | `nadia123` | Overdue blocked account test |
| 👨‍🏫 **Faculty** | `karim.faculty@uels.edu` | `faculty123` | Faculty borrowing account |

> 💡 **Note for Self-Registration**: New students must sign up using an **`@std.ewubd.edu`** email, and faculty must use an **`@ewubd.edu`** email.

---

## 🛠️ Tech Stack
- **Core**: Node.js & Express.js
- **Frontend Template Engine**: EJS with Tailwind CSS & Custom Train Animations
- **Database**: MySQL/MariaDB (configured for XAMPP default settings)
- **Offline Mode**: Automatic JSON Data Fallback (`data/seed_data.json`)
- **Authentication & Security**: Session-based auth with `express-session`, `express-mysql-session`, and `bcrypt` password hashing

---

## 🚀 Quick Start / Installation & Setup

Follow these steps to deploy and run the project locally on your machine:

### 1. Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [XAMPP](https://www.apachefriends.org/) (with Apache & MySQL modules running — *optional if testing in Offline Demo Mode*)

### 2. Clone or Copy Files
Navigate to the project root directory:
```bash
git clone https://github.com/CodeWithPritom/EWUELS-Project.git
cd EWUELS-Project
```

### 3. Install NPM Dependencies
Run the install command to configure all required modules:
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
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
*What this does:* Connects to your local MySQL instance, creates `uels_db`, registers all tables, seeds fine rates, and inserts the default administrator account.

### 6. Run the Application
Start the development server using `nodemon`:
```bash
npm run dev
```
Open your browser and visit: **[http://localhost:3000](http://localhost:3000)**

---

## 🔌 Offline / Demo Mode (Database Fallback)

EWU ELS includes a built-in **Hybrid Fallback System**. If MySQL is unavailable (e.g., XAMPP is not running), the application automatically switches to **Demo Mode**, serving data directly from:

```
/data/seed_data.json
```

### What works in Demo Mode:
- ✅ Full website navigation & responsive UI
- ✅ Login for all roles using the Demo Credentials table above
- ✅ Admin Dashboard & live statistics
- ✅ Equipment Catalog with search, category filters & photo showcase
- ✅ Fine settings, maintenance logs & audit logs

---

## 👥 Role-Based Overview

### 👨‍🎓 Student / Faculty
- **EWU Email Verification**: Requires `@std.ewubd.edu` (Students) or `@ewubd.edu` (Faculty).
- **Browse Catalog**: Real-time search, category filter, availability toggles, and item photos.
- **Requests**: Submit borrow requests with duration types (Min 2 minutes or 1 day).
- **5-Min Cancellation Window**: Cancel approved reservations within a 5-minute cooldown period.
- **My Fines & History**: Track borrowings and outstanding fine balances.

### 👮 Lab Staff
- **Approve / Reject Queue**: Review pending student requests.
- **Issue Equipment**: Hand over items to students (starts the borrowing timer).
- **Process Returns**: Inspect item condition (Good/Damaged), calculate overdue fees, and handle returns.
- **Fine & Block Management**: Mark fines as Paid (automatically unblocks students).

### 👑 System Administrator
- **Equipment Types & Photos**: Create equipment categories with auto-cropped image upload support.
- **Manage Copies**: Track physical unit statuses (`Available`, `Pending`, `Reserved`, `Issued`, `Maintenance`) and unit codes (e.g. `LAP-001`).
- **Staff Accounts**: Register credentials for lab staff assistants.
- **Fine Rate Configuration**: Modify rates per day/minute dynamically from UI.
- **Audit Logs**: View timestamped logs of all administrative actions.

---

## 🧪 QA Testing & Verification
To test database structure, overdue calculations, and automated unblock logic, run:
```bash
node qa_test.js
```

---
*Created for East West University (EWU) — Equipment Lending System*
