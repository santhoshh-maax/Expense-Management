# Smart Expense Tracker - Frontend Application

A clean, modern SaaS personal finance dashboard built with pure Vanilla JavaScript (ES6+), HTML5, and CSS3.

## Features
- **Modern Clean SaaS UI**: Inter typography, clean white/light grey canvas, blue accents, soft shadows, responsive mobile drawer.
- **Firebase Authentication**: Email and password registration, login, logout, and token management.
- **Dashboard Overview**: Metrics cards (Total Balance, Monthly Income, Monthly Expenses, Net Cash Flow, Budget Usage), Chart.js visualizations (Category Doughnut, Spending Trends Line, Income vs Expense Bar), and recent transactions list.
- **Transactions Management**: Filterable by search keyword, type (Expense/Income), category, and date range; sortable by amount and date; paginated with real backend data.
- **Budgets**: Overall monthly spending limit and individual category budgets with color-coded progress bars (normal, warning at 80%, exceeded at 100%).
- **Reports & Analytics**: Preset date ranges, top spending categories, period-over-period comparison, and safe CSV export with formula injection mitigation.
- **Categories**: Default categories plus customizable user categories with icons.
- **Settings**: Currency selection (INR, USD, EUR, GBP, CAD, AUD, JPY), date display format preferences, and profile settings.

## Running Locally
You can serve the `frontend/` directory using any static file server:

### Option 1: Live Server in VS Code
Right-click `frontend/index.html` -> "Open with Live Server" (typically at `http://127.0.0.1:5500/frontend/`).

### Option 2: Using Node `npx serve`
```bash
npx serve frontend -p 5500
```

### Option 3: Python Built-in HTTP Server
```bash
python -m http.server 5500 --directory frontend
```

Then open `http://localhost:5500` in your web browser.

## Configuration
Edit `frontend/js/config.js` to point `API_BASE_URL` to your backend server (defaults to `http://localhost:5000/api/v1`) and insert your Firebase Web Configuration keys.
