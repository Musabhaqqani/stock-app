# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # dev server on :3000
npm run build          # production build
npm run typecheck      # tsc --noEmit
npm run lint           # eslint
npm test               # vitest run
npx vitest run src/lib/calc.test.ts        # single test file
npx vitest run -t "ranks by gap descending" # single test by name

npx prisma migrate dev --name <change>   # schema change: writes + applies a migration
npx prisma migrate deploy                # apply pending migrations (prod/CI)
npm run db:studio      # browse the database
npm run user:add -- "Name" ["passphrase"]  # grant access from the CLI
```

`.env` must exist (copy `.env.example`) with `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`.

**Never accept `prisma migrate dev`'s offer to reset the database.** It drops every table. If it prompts, there is drift between the migration history and the schema — stop and baseline instead (`prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script` into a migration folder, then `prisma migrate resolve --applied`). Two resets have already destroyed the seed data this way.

**`npm run build` and `npm run dev` share `.next` — never run them at the same time.** The dev server starts throwing `ENOENT .next/server/app/**/page.js` or `__webpack_modules__[moduleId] is not a function`. Fix: stop both, `rm -rf .next`, restart.

## Architecture

Next.js App Router with shadcn/ui. Server components by default; client components only where interaction demands it (charts, dialogs, inline editors). There is no REST API layer — mutations are server actions, reads happen directly in page components.

**Routes** live under the `(app)` route group, whose [layout](src/app/(app)/layout.tsx) calls `requireUser()` and renders the sidebar shell. Any route added to that group is authenticated automatically.

| Route | Purpose |
|---|---|
| `/` | Dashboard — metric cards + buy-next ranking |
| `/holdings` | Charts + editable holdings table + add dialog |
| `/users` | Admin-only user management |
| `/login` | Outside the group; the only unauthenticated page |

## Performance: round trips are the whole budget

**The database is ~1.3 s away** (Neon in `us-east-1`; the app is used from India), and the pooler only runs about two queries concurrently. Page time is therefore *number of sequential queries × 1.3 s* — nothing else is close to mattering. Measured: one round trip ≈ 1.35 s, four sequential ≈ 6.4 s.

Three things follow, and breaking any of them regresses the app badly:

1. **One query per page.** [loadSession()](src/lib/session-data.ts) fetches the user, their settings and their holdings in a single `relationLoadStrategy: "join"` query, wrapped in React `cache` so the layout and page share it. Dropping the join strategy makes Prisma issue a query per relation.
2. **The session costs no query to identify.** The signed cookie carries the user id, so `loadSession` validates and loads data in the same trip.
3. **Never await the price API during render.** [loadPortfolio()](src/lib/portfolio.ts) schedules stale refreshes with `after()`, which runs post-response. A brand-new user with no cached prices used to block the page for over 30 s on 21 live fetches; now it renders in ~3.5 s and prices land on the next load. The Refresh button is the awaited path when someone wants to wait.

Result: `/` and `/holdings` went from ~6.8 s to ~1.45 s. `/users` is ~2.9 s because it needs a second query for the user list.

**The biggest remaining win is moving the Neon project to a region near the user** (`ap-south-1`), which would cut that 1.3 s to tens of milliseconds.

Every route has a `loading.tsx` skeleton, and the sidebar shows a per-link spinner via `useLinkStatus`, so navigation feels responsive regardless.

## UI conventions

**shadcn here is the Base UI build, not Radix.** Components take `render={<El />}` where older shadcn used `asChild`; `asChild` fails to typecheck. When the rendered element isn't a real `<button>`, also pass `nativeButton={false}` or Base UI warns at runtime.

**Charts are shadcn `ChartContainer` + Recharts**, on `/holdings`. Chart colours must come from CSS variables (`var(--chart-1)`, `var(--under)`, `var(--over)`) — a hardcoded hex only looks right in one theme.

**Theming is centralised in [globals.css](src/app/globals.css)**: shadcn's stock light/dark palettes plus two app-specific tokens, `--under` (below target weight) and `--over` (above). Restyle by editing those variables, not component classes. Light/dark is `next-themes` with `attribute="class"`, defaulting to dark; `<html>` needs `suppressHydrationWarning`.

**Font variables must stay on `<html>`** — Tailwind resolves `--font-display` at `:root`, so defining them on `<body>` silently falls back to system fonts.

**[src/lib/calc.ts](src/lib/calc.ts) owns every number the UI shows.** Pure functions, no I/O, unit-tested in `calc.test.ts`. If a figure looks wrong, it is derived here — components only format. Guards that matter: an empty portfolio yields zero weights rather than dividing by zero, a zero price holds share count steady rather than producing infinite targets, and `sharesToBuyNext` floors at zero (no sell signals — see DECISIONS.md).

**Prices come from two providers, in [src/lib/providers/](src/lib/providers/).** [prices.ts](src/lib/prices.ts) orchestrates; it knows nothing about URLs, instrument keys or ticker suffixes.

- **Upstox** is primary — one request for the whole portfolio, needs `UPSTOX_ACCESS_TOKEN` (an *analytics* token: 1-year, read-only, no daily re-login). Without the env var it is skipped entirely, including the instrument-file download.
- **Yahoo** is the fallback and the *only* symbol-search provider.

Fallback is **per ticker**: whatever Upstox doesn't return is asked of Yahoo. Both failing leaves the last cached price in place, labelled stale. The refresh toast names the provider that actually served the prices — that's how you tell whether Upstox is live.

`getPrices()` handles the DB cache (15 min TTL, shared across users). `refreshUserPrices()` writes back to a user's rows; failed tickers keep their previous price and timestamp.

**Every incoming price passes [price-guard.ts](src/lib/price-guard.ts)**, which rejects moves beyond ±50% of the last known value. This catches the failure staleness labels cannot: a wrong-but-plausible number that would silently corrupt every derived figure. Don't remove it when adding a provider.

**Adding a provider:** write a module in `providers/` exposing `fetchQuotes(tickers)`, then add it to the chain in `fetchQuotes()`. Nothing else changes.

**Auth is allowlist-only and there is still no public signup.** Users are created either by `scripts/add-user.ts` or by an existing admin at `/users` — both require an authenticated admin; neither is reachable from the login page. [src/lib/session.ts](src/lib/session.ts) does cookie signing (pure, no I/O); [src/lib/auth.ts](src/lib/auth.ts) does login and the `requireUser()` / `requireAdmin()` gates.

**Hiding a nav link is not access control.** `/users` and every action in [users/actions.ts](src/app/(app)/users/actions.ts) call `requireAdmin()` server-side. Self-demotion and self-deletion are blocked there too, not just in the menu.

**Portfolios are personal: new users start with zero holdings.** Nothing is seeded, by either the admin UI or `user:add` — every holding on a dashboard is one that user added. `SEED_STOCKS` in [seed-data.ts](src/lib/seed-data.ts) exists only as the historical bootstrap for the first account; do not wire it into user creation. Empty states on both `/` and `/holdings` route people to the stock search.

**Adding a holding goes through NSE search.** [searchStocks()](src/lib/prices.ts) queries the provider's symbol endpoint and keeps only `NSI` (NSE) equities — a match on another exchange would price in the wrong currency. [searchStocksAction](src/app/(app)/search-actions.ts) sits behind `requireUser()` so the app can't be used as an open search relay. Manual ticker entry still works for anything the provider doesn't list.

**Multi-user scoping:** `Stock` and `PortfolioSettings` are keyed by `userId`. Mutations re-derive the user from the session and scope writes with `updateMany`/`deleteMany` on `{ id, userId }`, so a forged id from a form is a no-op rather than a cross-user write. Never trust a user id arriving in a FormData.

**Mobile:** the holdings table renders as cards below `md` and a real table above it — nine numeric columns cannot compress to phone width. Inline editors commit on blur as well as Enter, because the numeric keypad has no Enter key.

See [DECISIONS.md](DECISIONS.md) for why the price source, database, auth model and caching were chosen, and what to do when the price endpoint breaks.

## Gotcha worth knowing

A holding can be **overweight by current weight yet still appear in "buy next"**. `gap` measures against today's portfolio value; `sharesToBuyNext` measures against the total investment target. Early on, when little is invested, an expensive stock dominates current weight while still sitting below its target value. Both figures are correct — `calc.test.ts` pins this case, and [column-info.tsx](src/components/column-info.tsx) explains it to users in the Gap and To-buy popovers.

Every holdings column header is a button opening its own definition; `COLUMN_INFO` is the single place those explanations live. If a formula in `calc.ts` changes, update the matching entry there too — nothing enforces that they agree.

## Still to do

Scheduled background refresh (item 9 of the build order) is not implemented; prices refresh on page load and via the Refresh button. Hosting and phone-access questions in the spec below are still open — the cookie auth works fine on mobile, but a cron needs somewhere always-on.

# India Portfolio Rebalancing Tracker

A personal web app that tracks a target-weighted stock portfolio, shows live NSE prices, and tells the user which stock to buy next to stay on target. This replaces an earlier Google Sheet / React-artifact prototype — same logic, now with real live pricing and persistent storage.

## What this app does

1. Holds a list of stocks, each with: name, sector/theme, target weight %, current share price, shares owned.
2. Fetches **live NSE share prices** automatically (on page load and on a refresh interval), instead of the user typing prices in by hand.
3. Computes, per stock: current value, current weight %, target value, target share count, shares still needed to reach target, and a "gap" (target % − current %).
4. Shows a **"Buy next" ranking** — stocks sorted by largest gap first (most underweight vs. target) — mechanical rebalancing signal, not investment advice.
5. Lets the user add, edit, and remove stocks from the list at any time.
6. Persists everything (holdings, share counts, target weights, total investment target) between sessions for a single user — no multi-user auth needed.

## Non-goals (explicitly out of scope)

- No investment advice, valuation scoring, or "should I buy this" recommendations — the app only reports gaps to a user-defined target.
- No brokerage integration, no order placement — this is a read-only tracker.
- No multi-user accounts / login system unless the user asks for it later.

## Access control

This is a private app for a fixed, small set of people — not a public product.

- **No signup page, no self-registration, ever.** The only way a person gets access is an admin manually adding a row to a users/allowlist table (directly via a DB tool, a small seed script, or an admin-only CLI command — not a UI form, since a form implies a public entry point).
- **Login only.** A simple login screen checks whatever credential the allowlisted user was given against the table, then issues a session. No "forgot password" flow that emails a reset link unless the person specifically wants email infrastructure added later — that's more moving parts than this needs.
- **Simplest workable credential:** a short passphrase or access code the admin sets when adding the row, not a full username/password system with reset flows. Store it **hashed** (bcrypt/argon2), never plaintext, even though this is "light" — hashing a password is not optional regardless of how small the app is.
- **Session handling:** a signed, httpOnly session cookie is enough. No need for OAuth, JWT refresh token rotation, or a session store in a separate service — a single cookie plus a server-side check against the users table is proportionate to the size of this app.
- **Nothing sensitive lives in the database.** Concretely:
  - No real brokerage account numbers, PAN, Aadhaar, bank details, or any financial-account credentials — this app only ever stores portfolio *modeling* data (stock names, target %, share counts, prices), which isn't sensitive on its own.
  - No storing of email/SMS credentials or third-party API keys in the database — those live in environment variables / a secrets manager the deployment platform provides, never in a DB table or committed to the repo.
  - Keep the users table minimal: an identifier (name or email), the hashed passphrase, and nothing else unless there's a concrete reason to add a field.
- **Multi-user shape:** each user's portfolio data should be scoped to their own row (a `userId` foreign key on `Stock` and `PortfolioSettings`), so multiple allowlisted people can each track their own holdings without seeing each other's — even though the backend is light, don't let "light" become "everyone shares one global portfolio" unless that's actually what's wanted.

## Tech stack

Use whatever the person already has set up in this repo. If starting fresh, a sensible default:

- **Frontend + backend**: Next.js (App Router), TypeScript, Tailwind CSS
- **Charts**: Recharts (bar chart for current-vs-target weight, donut/pie for allocation by value)
- **Persistence**: SQLite via Prisma (simplest for a single-user local/personal-hosted app) — or a flat JSON file on disk if the person wants zero database setup. Ask which they'd prefer if unclear.
- **Price data source**: see "Live price fetching" below — pick one and document the choice in a `DECISIONS.md` or code comment, since this is the part most likely to need revisiting later.

## Live price fetching

This is the part that couldn't be done in a sandboxed artifact and is the actual reason this is becoming a real app. Implement it server-side (API route / server action), never client-side, so API keys aren't exposed and CORS isn't an issue.

**Options, roughly in order of reliability vs. effort:**

1. **Paid market data API** (e.g. a provider offering official NSE/BSE feeds) — most reliable, has a subscription cost, respects terms of service. Best choice if this needs to be dependable long-term.
2. **Free-tier finance data API** (e.g. Yahoo Finance–style endpoints, ticker suffix `.NS` for NSE) — no official support/SLA, can rate-limit or change without notice, but works well enough for a personal low-frequency refresh (every 15–30 min, not tick-by-tick).
3. **Direct scraping of a public price page** — most fragile, breaks whenever the source site changes its markup, and may violate that site's terms of use at any real refresh frequency. Avoid unless options 1–2 aren't viable; if used, isolate it behind a single well-commented module so it's easy to swap out when it breaks.

**Requirements regardless of source:**
- Cache fetched prices server-side for a short window (e.g. 5–15 min) so the app isn't hammering the data source on every page load.
- Handle fetch failures gracefully — fall back to the last successfully fetched price, show a "prices last updated at [time]" indicator, never crash the dashboard because one ticker failed.
- Store a `lastUpdated` timestamp per stock so the UI can show staleness.
- Map the app's stock names to whatever ticker symbols the chosen data source expects (NSE tickers, e.g. `BHARTIARTL`, `TITAN`, `ICICIBANK` — confirm exact symbols per stock when wiring this up, don't guess).

## Data model

```
User {
  id: string
  name: string              // display name, set by admin
  passphraseHash: string    // bcrypt/argon2 hash, never plaintext
  createdAt: datetime
}

Stock {
  id: string
  userId: string             // owner — scopes this holding to one allowlisted user
  name: string
  theme: string          // sector/category label, freeform
  targetPct: number       // e.g. 7 for 7%
  price: number            // last fetched or manually entered price, in INR
  shares: number            // whole shares owned
  ticker: string            // NSE symbol used to fetch live price, e.g. "BHARTIARTL"
  lastPriceUpdate: datetime | null
}

PortfolioSettings {
  userId: string             // one settings row per user
  totalInvestmentTarget: number   // INR, drives target value calc per stock
}
```

## Core calculations (per stock, recomputed on any data change)

```
currentValue    = price * shares
currentWeightPct = currentValue / sum(all currentValue) * 100
targetValue     = (targetPct / 100) * totalInvestmentTarget
targetShares    = round(targetValue / price)
sharesToBuyNext = max(targetShares - shares, 0)
gap             = targetPct - currentWeightPct
```

"Buy next" list = all stocks with `sharesToBuyNext > 0`, sorted by `gap` descending.

## Starter data

Seed the database with this list on first run (same 21 stocks used in the prototype). Prices below are placeholders from mid-Aug 2026 — replace with a live fetch as soon as the price-fetching module works, don't leave these hardcoded.

```json
[
  { "name": "Bharti Airtel", "ticker": "BHARTIARTL", "theme": "Digital Infrastructure", "targetPct": 7, "price": 1924, "shares": 1 },
  { "name": "Titan Company", "ticker": "TITAN", "theme": "Premium Consumer", "targetPct": 7, "price": 5090, "shares": 1 },
  { "name": "Pidilite Industries", "ticker": "PIDILITIND", "theme": "Construction Ecosystem", "targetPct": 6, "price": 1686, "shares": 1 },
  { "name": "Bajaj Finance", "ticker": "BAJFINANCE", "theme": "Consumer Finance", "targetPct": 6, "price": 1102, "shares": 1 },
  { "name": "ICICI Bank", "ticker": "ICICIBANK", "theme": "Financial Infrastructure", "targetPct": 6, "price": 1423, "shares": 1 },
  { "name": "Trent", "ticker": "TRENT", "theme": "Organized Retail", "targetPct": 6, "price": 3025, "shares": 1 },
  { "name": "Larsen & Toubro", "ticker": "LT", "theme": "Engineering & Infrastructure", "targetPct": 6, "price": 4037, "shares": 1 },
  { "name": "Adani Ports and Special Economic Zone", "ticker": "ADANIPORTS", "theme": "Trade & Logistics", "targetPct": 6, "price": 1681, "shares": 1 },
  { "name": "Dixon Technologies", "ticker": "DIXON", "theme": "Electronics Manufacturing", "targetPct": 5, "price": 14023, "shares": 1 },
  { "name": "Kaynes Technology India", "ticker": "KAYNES", "theme": "Advanced Electronics", "targetPct": 5, "price": 3718, "shares": 1 },
  { "name": "KPIT Technologies", "ticker": "KPITTECH", "theme": "Software-Defined Mobility", "targetPct": 5, "price": 630, "shares": 1 },
  { "name": "Persistent Systems", "ticker": "PERSISTENT", "theme": "Enterprise Technology & AI", "targetPct": 4, "price": 4639, "shares": 1 },
  { "name": "Mahindra & Mahindra", "ticker": "M&M", "theme": "Mobility & Farm Mechanisation", "targetPct": 4, "price": 3498, "shares": 1 },
  { "name": "InterGlobe Aviation", "ticker": "INDIGO", "theme": "Aviation", "targetPct": 4, "price": 5236, "shares": 1 },
  { "name": "Astral", "ticker": "ASTRAL", "theme": "Building Materials", "targetPct": 4, "price": 1481, "shares": 1 },
  { "name": "APL Apollo Tubes", "ticker": "APLAPOLLO", "theme": "Structural Building Systems", "targetPct": 4, "price": 2010, "shares": 1 },
  { "name": "Polycab India", "ticker": "POLYCAB", "theme": "Electrical Infrastructure", "targetPct": 3, "price": 9125, "shares": 1 },
  { "name": "KEI Industries", "ticker": "KEI", "theme": "Electrical Infrastructure", "targetPct": 3, "price": 5645, "shares": 1 },
  { "name": "Max Healthcare Institute", "ticker": "MAXHEALTH", "theme": "Healthcare", "targetPct": 3, "price": 1069, "shares": 1 },
  { "name": "Krishna Institute of Medical Sciences", "ticker": "KIMS", "theme": "Healthcare", "targetPct": 3, "price": 810, "shares": 1 },
  { "name": "Bharat Electronics", "ticker": "BEL", "theme": "Strategic Technology & Defence", "targetPct": 3, "price": 406, "shares": 1 }
]
```

Confirm each ticker against the chosen data source before relying on it — some data providers use slightly different symbol formats (e.g. `M%26M` vs `M&M`, `.NS` suffix required or not).

## UI / design direction

Reuse the visual language from the existing prototype rather than defaulting to generic dashboard styling:

- Dark "ledger" theme: navy background (`#0F1B2D` page, `#16263D` cards, `#26374F` borders)
- Amber accent (`#E8A33D`) for emphasis/underweight indicators, red (`#D9645B`) for overweight
- Typography: serif display face for headings (e.g. Source Serif 4), monospace for all numeric data (e.g. IBM Plex Mono) — this "ledger + ticker tape" pairing is the app's visual signature, keep it
- Layout: metric cards row (current value, target investment, cost to close gaps, holdings count) → weight comparison bar chart → buy-next list + allocation donut side by side → editable holdings table → add/import controls

## Features to implement, in order

1. Users table + admin-only script to add a user (name + passphrase, hashed on insert) — no UI form for this, run it from the command line
2. Login page + session cookie check; every other route requires a valid session and redirects to login otherwise
3. Data model + persistence (CRUD for stocks, settings), scoped to the logged-in user's `userId`
4. Static dashboard UI using seed data (port the existing React artifact's layout/logic almost directly — it's already built and tested)
5. Live price fetch module (server-side, one data source, with caching and graceful fallback)
6. Wire fetched prices into the dashboard, replacing manual price entry as the default (keep manual override available — user should still be able to type a price if the fetch is stale or wrong)
7. "Last updated" indicator per stock and portfolio-wide
8. Add/edit/remove stock UI (already prototyped, port directly)
9. Optional: scheduled background refresh (cron / interval) so prices update even without a page load, if hosting environment supports it

## Open questions to resolve with the user before/while building

- Which price data source are they willing to use — paid API (reliable, has cost) vs free-tier (no SLA, works for personal low-frequency use)?
- Where will this be hosted — local machine only, or a small always-on server/serverless deployment?
- Is single-device use enough, or do they want to check it from their phone too (affects hosting/auth decisions)?