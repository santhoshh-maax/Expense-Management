# Smart Expense Management System

A full-stack, secure personal finance and expense management web application built with **Vanilla JavaScript (ES6+)**, **HTML5**, **CSS3**, **Chart.js**, and an **Express.js / Node.js REST API** powered by **Firebase Admin SDK** and **Firebase Authentication**.

---

## 1. Architecture Overview

### Frontend
- **Technology**: Pure HTML5, modern CSS3 design system, Vanilla JavaScript (ES6+), Chart.js for data visualization, and Lucide icons.
- **Pages**:
  - `index.html`: Entry point and session router.
  - `login.html`: Secure user sign-in.
  - `register.html`: New user registration.
  - `dashboard.html`: Financial overview, metrics summary cards, and interactive Chart.js graphs.
  - `transactions.html`: Full CRUD transactions table with search, category/type/date filtering, sorting, and pagination.
  - `budgets.html`: Monthly overall spending limits and category-specific budgets with color-coded progress bars.
  - `reports.html`: Analytics, top-spending categories, period-over-period comparison, and formula-injection-safe CSV export.
  - `categories.html`: Management for default and custom income/expense categories with icons.
  - `settings.html`: User preferences (Currency selection: INR, USD, EUR, GBP, CAD, AUD, JPY; Date display formats: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY; Profile name).

### Backend
- **Technology**: Node.js v20+ / Express.js REST API architecture.
- **Security**:
  - `helmet` security headers.
  - `cors` origin restriction.
  - `express-rate-limit` request rate limiting.
  - Firebase ID token verification via `Firebase Admin SDK` (`Bearer <token>`).
  - Strict user-level UID scoping for all Firestore database queries (users can never access or modify another user's records).
  - Server-side input validation and error masking.
  - Formula injection mitigation for CSV statement exports.
  - In-memory mock repository fallback for development and automated testing without live credentials.

---

## 2. Project Directory Structure

```text
Expense Management/
├── frontend/
│   ├── index.html            (Router entry point)
│   ├── login.html            (User sign-in)
│   ├── register.html         (User account creation)
│   ├── dashboard.html        (Financial summary cards & Chart.js graphs)
│   ├── transactions.html     (Filterable, searchable, paginated CRUD)
│   ├── budgets.html          (Monthly spending limits & progress bars)
│   ├── reports.html          (Analytics, trends, and CSV export)
│   ├── categories.html       (Default & custom categories management)
│   ├── settings.html         (Currency & date format preferences)
│   │
│   ├── css/
│   │   ├── style.css         (Design tokens, typography, CSS variables)
│   │   ├── dashboard.css     (Layout, sidebar, metrics, chart cards)
│   │   ├── components.css    (Buttons, forms, tables, modals, badges, toasts)
│   │   ├── responsive.css    (Mobile drawer & responsive breakpoints)
│   │   └── auth.css          (Clean SaaS login & register card styling)
│   │
│   ├── js/
│   │   ├── config.js         (API base URL & Firebase web configuration)
│   │   ├── api.js            (Fetch API client with Bearer token injection)
│   │   ├── auth.js           (Firebase Authentication client & session state)
│   │   ├── utils.js          (Currency/date formatting, HTML escaping, toasts, modals)
│   │   ├── dashboard.js      (Dashboard controller & Chart.js integrations)
│   │   ├── transactions.js   (Transaction CRUD, filters, pagination)
│   │   ├── budgets.js        (Budget calculations & spending tracking)
│   │   ├── reports.js        (Analytics, period comparison, and CSV export)
│   │   ├── categories.js     (Category CRUD with usage safety checks)
│   │   └── settings.js       (User preferences management)
│   └── README.md
│
├── backend/
│   ├── src/
│   │   ├── server.js         (Server entry point & port listener)
│   │   ├── app.js            (Express app, Helmet, CORS, Rate-limiter, routes)
│   │   ├── config/
│   │   │   └── firebase.js   (Firebase Admin SDK init with mock fallback)
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js      (Firebase token validation & UID extraction)
│   │   │   ├── error.middleware.js     (Global error & 404 handlers)
│   │   │   └── validate.middleware.js  (Request validation runner)
│   │   ├── routes/
│   │   │   ├── health.routes.js        (GET /api/v1/health)
│   │   │   ├── auth.routes.js          (GET /api/v1/auth/me)
│   │   │   ├── transaction.routes.js   (CRUD endpoints)
│   │   │   ├── category.routes.js      (Category endpoints)
│   │   │   ├── budget.routes.js        (Budget endpoints)
│   │   │   ├── dashboard.routes.js     (Summary & Chart datasets)
│   │   │   ├── report.routes.js        (Analytics summary & CSV export)
│   │   │   └── settings.routes.js      (User preferences)
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── validators/
│   │   └── utils/
│   ├── tests/
│   │   └── api.test.js       (Comprehensive automated test suite)
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
│
├── .gitignore
├── package.json
└── README.md
```

---

## 3. Installation & Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher (v22.x recommended). Check version with: `node -v`
- **npm**: v9.0.0 or higher. Check version with: `npm -v`

### Step 1: Install Backend Dependencies
Open PowerShell or your terminal in the project root:

```powershell
cd backend
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` inside `backend/`:

```powershell
Copy-Item .env.example .env
```

Default `.env` settings:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000
FIREBASE_PROJECT_ID=expense-tracker-demo
MOCK_FIREBASE=true
```

> **Note on Mock Mode**: When `MOCK_FIREBASE=true`, the backend boots with an in-memory Firestore repository so you can test and explore immediately without waiting to register a Google Cloud project!

### Step 3: Run Automated Tests
Verify all 14 REST API tests pass:

```powershell
npm test
```

### Step 4: Start the Server (Frontend + Backend in One Command!)
```powershell
npm run dev
# or: npm start
```

The Express server will start and directly host your entire frontend web application and REST API together:
```text
======================================================
  Smart Expense Management System is Running!
======================================================
👉 Access Frontend Application: http://localhost:5000
👉 Backend Health Endpoint:     http://localhost:5000/api/v1/health
======================================================
```

Simply open **`http://localhost:5000`** in your web browser! No need to run a second server.


---

## 4. Connecting Live Firebase (Production Setup)

### 1. Firebase Authentication & Firestore Setup
1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. In the sidebar under **Build**:
   - Enable **Authentication**: Choose the **Email/Password** provider and enable it.
   - Enable **Firestore Database**: Create database in production mode.
3. In **Firestore Security Rules**, configure:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only the authenticated user can access their own subcollections
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 2. Service Account for Backend
1. Go to **Project Settings** -> **Service accounts**.
2. Click **Generate new private key** and download the JSON file.
3. Save the file securely as `backend/service-account.json`. (This file is ignored by `.gitignore`).
4. Update `backend/.env`:
```env
MOCK_FIREBASE=false
FIREBASE_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

### 3. Frontend Web Client Config
1. In the Firebase Console, go to **Project Settings** -> **General** -> **Your apps** -> **Add Web App**.
2. Copy the credentials into `frontend/js/config.js`:
```javascript
const CONFIG = {
  API_BASE_URL: 'http://localhost:5000/api/v1',
  FIREBASE_CONFIG: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  },
  ENABLE_DEMO_AUTH_FALLBACK: false
};
```

---

## 5. REST API Documentation

Base URL: `/api/v1`

### Health
- `GET /health`: Server status, uptime, environment, and database mode.

### Authentication
- `GET /auth/me`: Validates ID token and returns authenticated user metadata.

### Transactions
- `GET /transactions`: Retrieve paginated transactions. Query parameters: `page`, `limit`, `search`, `type`, `category`, `startDate`, `endDate`, `sortBy`, `sortOrder`.
- `GET /transactions/:id`: Retrieve single transaction by ID.
- `POST /transactions`: Create new transaction (`type`, `title`, `amount`, `category`, `date`, `paymentMethod`, `notes`).
- `PATCH /transactions/:id`: Update permitted fields.
- `DELETE /transactions/:id`: Delete transaction.

### Categories
- `GET /categories`: Retrieve system default and custom categories. Optional query: `type`.
- `POST /categories`: Create custom category (`name`, `type`, `icon`).
- `PATCH /categories/:id`: Update category.
- `DELETE /categories/:id`: Delete category (checks if in use by transactions; optional `?force=true`).

### Budgets
- `GET /budgets`: Retrieve budgets for a given month and year with live calculated spending and percentage. Query parameters: `month`, `year`.
- `POST /budgets`: Create or update spending budget (`categoryId`, `categoryName`, `amount`, `month`, `year`).
- `DELETE /budgets/:id`: Delete budget.

### Dashboard & Analytics
- `GET /dashboard/summary`: Summary metrics (Total Balance, Period Income, Period Expenses, Net Cash Flow, Budget Usage).
- `GET /dashboard/charts`: Formatted Chart.js datasets (Category Breakdown, Daily Trends, 6-Month Income vs Expenses).
- `GET /reports/summary`: Period analytics, top spending categories, and previous period comparison.
- `GET /reports/export`: Safe CSV export respecting active filters and sanitized against formula injection.

### Settings
- `GET /settings`: User preferences (currency, date format, display name).
- `PATCH /settings`: Update user preferences.

---

## 6. Testing & Quality Assurance

To execute automated tests against all endpoints and business logic:
```powershell
cd backend
npm test
```
The test suite verifies:
1. Health endpoint availability.
2. Unauthenticated request rejection (401).
3. Invalid token rejection (401).
4. Input validation error handling (400) for negative amounts and missing titles.
5. Expense transaction creation.
6. Income transaction creation.
7. Search, filtering, and pagination.
8. Transaction updates (PATCH).
9. Default and custom category management.
10. Budget spending calculations and threshold detection.
11. Dashboard calculations (Balance, Income, Expenses, Cash flow).
12. CSV statement export with formula injection escaping.
13. Safe transaction deletion.
