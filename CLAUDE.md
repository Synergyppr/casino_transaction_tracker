@AGENTS.md

# Casino del Mar - Player Tracking System

## Project Overview

This application replaces an Excel spreadsheet used by Casino del Mar to track player transactions.
Cashiers log Cash In / Cash Out transactions per player per day. Supervisors and managers monitor
compliance thresholds and manage cashier accounts. Categories match the official CTR
(Currency Transaction Report) form sections 25 (Cash In) and 27 (Cash Out).

All data will be managed via a REST API built by the backend team. The frontend is a Next.js 16
client-side application that consumes these endpoints.

---

## Tech Stack

- **Framework:** Next.js 16.2.7 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4 (dark theme, `@theme inline` syntax)
- **Icons:** Lucide React
- **Fonts:** Barlow (sans) + JetBrains Mono (mono) via `next/font/google`
- **Animations:** tw-animate-css

---

## Project Structure

```
app/
  layout.tsx          # Root layout (fonts, metadata)
  page.tsx            # Root page (auth gate: Login vs MainApp)
  globals.css         # Theme variables, Tailwind config, base styles
  components/         # All UI components (one per file)
    LoginScreen.tsx
    MainApp.tsx       # App shell: sidebar, header, view routing
    DashboardView.tsx
    DailyEntryView.tsx
    MonitoringView.tsx
    ReportsView.tsx
    AdminView.tsx
    AuditView.tsx
    Modal.tsx         # Reusable modal (closes on overlay click + X button)
    PlayerTable.tsx   # Reusable player data table
    StatusBadge.tsx   # Alert status indicator
    AmtCell.tsx       # Amount cell with threshold coloring
  lib/                # Centralized shared logic (import from here, not components)
    types.ts          # All TypeScript interfaces and type aliases
    constants.ts      # Thresholds, seed data, transaction categories
    utils.ts          # Shared utility functions (formatting, calculations)
```

### Library Folder Convention (`app/lib/`)

All shared logic lives in `app/lib/`. If a function, type, constant, or hook is used by
more than one component or page, it MUST be placed in `app/lib/` and imported from there.

- `types.ts` - All shared TypeScript types and interfaces
- `constants.ts` - Application constants, thresholds, category lists
- `utils.ts` - Pure utility functions (formatting, calculations, status logic)
- Future: `api.ts` - API client functions (see API Endpoints below)
- Future: `hooks.ts` - Custom React hooks shared across components

---

## Business Logic

### Threshold Rules (CRITICAL)

| Status     | Threshold  | Color   | Action                        |
|------------|-----------|---------|-------------------------------|
| Normal     | $0-$7,499 | Neutral | No alert                      |
| Warning    | $7,500+   | Amber/Yellow | Management attention needed |
| Compliance | $10,000+  | Emerald/Green | Documentation required     |

**Incoming and outgoing are tracked INDEPENDENTLY.** Never combine them for threshold checks.
Thresholds are per-day, not lifetime.

### User Roles

| Role       | Can Do                                                     |
|------------|-------------------------------------------------------------|
| Cashier    | Enter transactions, search players, view daily activity     |
| Supervisor | + Manage cashiers, view reports, view alerts, audit         |
| Manager    | + Create cashier accounts, export reports, full access      |

### Transaction Categories (from CTR Form)

**Cash In (Section 25):**
a. Deposit(s)
b. Payment(s)
c. Currency received for funds transfer(s) out
d. Purchase of negotiable instrument(s)
e. Currency exchange(s)
f. Currency to prepaid access
g. Purchases of casino chips, tokens and other gaming instruments
h. Currency wager(s) including money plays
i. Bills inserted into gaming devices
z. Other (specify)

**Cash Out (Section 27):**
a. Withdrawal(s)
b. Advance(s) on credit (including markers)
c. Currency paid from funds transfer(s) in
d. Negotiable instrument(s) cashed
e. Currency exchange(s)
f. Currency from prepaid access
g. Redemption(s) of casino chips, tokens, TITO tickets and other gaming instruments
h. Payment(s) on wager(s) (including race and OTB or sports pool)
i. Travel and complimentary expenses and book gaming incentives
j. Payment for tournament, contest or other promotions
z. Other (specify)
+ Debit card

### Duplicate Detection

When registering a player, the system checks for similar names on the same day and prompts
the user to either use the existing record or create a new one.

---

## API Endpoints

The backend developer is building a REST API. Below are the planned endpoints.
Update this section as endpoints are confirmed/changed.

### Authentication

```
POST   /api/auth/login          # PIN-based login → returns session/token + cashier profile
POST   /api/auth/logout         # Invalidate session
GET    /api/auth/me             # Get current authenticated user
```

### Players

```
GET    /api/players              # List players (query: ?date=YYYY-MM-DD&search=name)
POST   /api/players              # Create new player record for today
GET    /api/players/:id          # Get player with transactions
GET    /api/players/duplicates   # Check for duplicate names (query: ?name=...&date=...)
```

### Transactions

```
POST   /api/transactions                # Add transaction to a player
GET    /api/transactions                # List transactions (query: ?date=&playerId=&cashierId=)
GET    /api/transactions/:id            # Get single transaction
```

### Dashboard & Monitoring

```
GET    /api/dashboard/stats      # Today's summary stats (players, txns, totals, alerts)
GET    /api/monitoring/alerts    # Players at warning/compliance level (query: ?status=warning|compliance)
```

### Reports

```
GET    /api/reports/daily        # Daily report (query: ?date=YYYY-MM-DD)
GET    /api/reports/export       # Export CSV (query: ?date=YYYY-MM-DD)
```

### Cashier Administration

```
GET    /api/cashiers             # List all cashier accounts
POST   /api/cashiers             # Create cashier account (manager only)
PATCH  /api/cashiers/:id         # Update cashier (activate/deactivate)
POST   /api/cashiers/:id/reset-pin  # Reset PIN (returns new PIN)
```

### Audit Log

```
GET    /api/audit                # Transaction audit log (query: ?date=&cashierId=&playerId=)
```

---

## UI Conventions

- **Modals** always support close via X button AND clicking outside (overlay)
- **Tables** use `overflow-x-auto` for mobile horizontal scroll
- **Forms** stack vertically on mobile, horizontal on desktop
- **Sidebar** collapses to hamburger menu below `lg` breakpoint
- **Theme** is dark by default (navy backgrounds, muted foreground)
- **Font usage:** `font-mono` for numbers, PINs, status badges, timestamps

---

## Current Status

- Phase 1: UI replication from Figma export - COMPLETE
- Phase 2: API integration - PENDING (waiting for backend endpoints)
- All data is currently using seed/mock data in `app/lib/constants.ts`
- When API is ready, replace seed data with fetch calls in a new `app/lib/api.ts`
