# StockSense - Modular Inventory Management System

**StockSense** is an enterprise-grade modular Inventory Management System engineered to digitize, streamline, and centralize stock-related operations across multi-facility warehouses in real-time.

---

## 🚀 Phase 1 Scope & Features Delivered

### 1. Authentication System
- **Login Page (`/login`)**:
  - Email & password authentication with bcrypt hash verification
  - "Remember me" option (persists session token for 30 days)
  - Interactive **Quick-Fill Credentials buttons** for instant evaluation
  - Form validation with feedback
  - Forgot password link & account creation link
  - Seamless redirection to the Inventory Dashboard upon authentication
- **Sign Up Page (`/signup`)**:
  - Full name, Work Email, Password, Confirm Password
  - Operational role selector: **Inventory Manager** vs **Warehouse Staff**
  - Validation: Password minimum length (8 chars), matching passwords, email syntax
  - Automatic provisioning and direct access to dashboard
- **Forgot Password with OTP Reset (`/forgot-password`)**:
  - Multi-step OTP recovery flow:
    1. Enter work email to request a 6-digit numeric OTP
    2. Enter OTP, new password, and confirmation
    3. Resend OTP with interactive 60-second cooldown timer
    4. Built-in developer demo OTP banner for local testing without external SMTP
    5. Success screen and redirection back to login

### 2. Inventory Dashboard (`/dashboard`)
- **5 Real-Time KPI Cards** (queried live from SQLite):
  1. **Total Products in Stock**: Live unit count, active SKU count, and total inventory valuation in USD
  2. **Low Stock / Out of Stock Items**: Alert threshold monitoring with breakdown of critical out-of-stock items vs low-stock warnings
  3. **Pending Receipts**: Inbound purchase orders awaiting dock check-in or inspection
  4. **Pending Deliveries**: Customer orders pending picking, packaging, or carrier dispatch
  5. **Internal Transfers Scheduled**: Inter-facility shuttle movements between distribution hubs
- **Dashboard Multi-Dimension Filters**:
  - **Document Type**: Receipts, Delivery, Internal, Adjustments (plus "All")
  - **Status**: Draft, Waiting, Ready, Done, Canceled (plus "All")
  - **Warehouse / Location**: WH-MAIN, WH-NORTH, WH-EAST, WH-COLD (plus "All")
  - **Product Category**: Electronics, Raw Materials, Packaging, Finished Goods, Hardware (plus "All")
  - **Live Search**: Instant keyword filtering across document reference, contact/partner, and locations
  - **Active Filter Pills** & One-click **Reset Filters** button
- **Recent Inventory Activity Section**:
  - Live data table displaying document reference, type badge with custom icons, partner/contact, logistics route (`Origin -> Destination`), item category, unit quantity, scheduled date, and color-coded status badge
  - **Operation Manifest Modal**: Click any row to view complete transfer route details, notes, internal document ID, and change workflow status
  - **Log New Stock Movement**: Interactive modal allowing operators to log new receipts, dispatches, transfers, or cycle adjustments directly into the SQLite database with instant KPI recalculation
  - Loading skeletons and empty states when search criteria yield no matches

### 3. Sidebar Navigation & Layout
- Fixed desktop sidebar & collapsible mobile/tablet drawer with all 10 problem-statement menu items:
  - 📊 **Dashboard** (Functional)
  - 📦 **Products** (Phase 2 Roadmap Preview)
  - 📥 **Receipts** (Phase 2 Roadmap Preview)
  - 📤 **Delivery Orders** (Phase 2 Roadmap Preview)
  - 🔄 **Internal Transfers** (Phase 2 Roadmap Preview)
  - ⚖️ **Inventory Adjustments** (Phase 2 Roadmap Preview)
  - 📜 **Move History** (Phase 2 Roadmap Preview)
  - ⚙️ **Settings** (Phase 2 Roadmap Preview)
  - 👤 **My Profile** (Phase 2 Roadmap Preview)
  - 🚪 **Logout** (Clears token, displays confirmation toast, redirects to login)
- Top Header Bar with Live SQLite sync indicator, active facility tag, user avatar, and quick logout.

---

## 🛠️ Technology Stack & Architecture

- **Backend**: Node.js, Express 5, `better-sqlite3` (high-performance embedded SQLite), JSON Web Tokens (`jsonwebtoken`), `bcryptjs`, `cors`, `dotenv`.
- **Database**: SQLite (`stocksense.db`) with tables for `users`, `password_resets`, `products`, `warehouses`, and `inventory_activities`.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v3, React Router DOM v7, Lucide React icons.
- **Design System**: Slate/Navy enterprise palette (`#0f172a`, `#1e293b`), crisp status indicators (`emerald`, `amber`, `blue`, `rose`), responsive layout for desktop and tablet screens.

---

## 🔑 Pre-Seeded Test Credentials

For quick evaluation, click the quick-fill buttons on the login page or use:

| Role | Email | Password |
|---|---|---|
| **Inventory Manager** | `admin@stocksense.io` | `Password@123` |
| **Warehouse Staff** | `staff@stocksense.io` | `Password@123` |

---

## 🏃 Running the Application

### Option 1: Standalone Fullstack Server (Express serving API + Built React Client)
```bash
npm start
```
Open **`http://localhost:5000`** in your browser.

### Option 2: Development Mode (Vite Hot-Reload + Backend API)
```bash
npm run dev
```
- Frontend: **`http://localhost:3000`** (with auto proxy to backend)
- Backend API: **`http://localhost:5000`**

### Running the Automated E2E Test Suite:
```bash
node scratch/test_api.js
```
Verifies all 15 authentication, database, filtering, and CRUD scenarios.
