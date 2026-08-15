# Decisions

Choices made while building, with enough reasoning to revisit them later.

## Price data: Upstox primary, Yahoo fallback

Two providers in [src/lib/providers/](src/lib/providers/), orchestrated by
[prices.ts](src/lib/prices.ts). Fallback is **per ticker**, not all-or-nothing:
if Upstox serves 19 of 21, only the other 2 are asked of Yahoo.

### Why Upstox is primary

Alpha Vantage was evaluated and rejected on arithmetic: its free tier allows 25
requests/day and `GLOBAL_QUOTE` takes one symbol per request, so a 21-holding
portfolio gets **one refresh per day**, and the batch endpoint is premium-only.
Its documented Indian coverage is BSE, not NSE.

Upstox instead gives, free:

- **up to 500 instruments per request** — the whole portfolio in one call
- an **Analytics Token valid for 1 year**, generated once from the Developer Apps
  page, with **no daily re-login**. This is the property that matters: every
  other free broker API (Angel One, Dhan, Fyers) expires its session at midnight,
  which would silently stop the unattended background refresh every night.
- market data without static-IP registration (only account APIs need that)
- **strictly read-only** — the token cannot place or modify orders

Zerodha was ruled out because live market data requires the ₹500/month plan; its
free "Personal" tier excludes market data entirely.

### Why Yahoo is kept

It needs no credentials, so the app prices holdings before Upstox is configured
and if the token lapses or is revoked. It is also the only symbol *search*
provider — Upstox has no public search endpoint, so the add-holding combobox
always goes through Yahoo.

Its weaknesses are unchanged: undocumented, no SLA, can change without notice.
That is acceptable for a fallback in a way it was not for a sole source.

### Instrument keys

Upstox addresses instruments by ISIN (`NSE_EQ|INE397D01024`), not ticker. The
mapping only exists in a ~2 MB gzipped master file, so it is cached in the
`Instrument` table and refreshed weekly — downloading it per request would dwarf
the quote call it enables. It is fetched lazily, only when an unmapped ticker
appears, and never at all when no Upstox token is configured.

**Verified 2026-08-15:** all 22 portfolio tickers resolve in the NSE master
(2,639 equities). Yahoo needs `M&M` URL-encoded as `M%26M.NS`.

### Known risk

Community reports exist of the Analytics Token returning `UDAPI100050` on Market
Quote despite the documentation. If that happens the app degrades automatically
to Yahoo and the refresh toast reports "via Yahoo" — which is exactly how you
would notice.

## Prices are sanity-checked, not just staleness-labelled

[price-guard.ts](src/lib/price-guard.ts) rejects any price that moves more than
±50% from the last known value.

Staleness labels catch a provider that *fails*. They cannot catch one that
returns a wrong-but-plausible number — another exchange's listing, a stale close,
a mis-resolved symbol. That value would silently corrupt every derived figure on
the dashboard while looking completely normal. Real single-session NSE moves are
bounded by circuit limits well inside ±50%.

A rejected price is logged and the previous value retained. A ticker with no
history is accepted as given, and a corrupt *previous* value is treated as no
history, so one bad cached number cannot permanently block real updates.

## Database: Neon Postgres (not SQLite)

The spec defaulted to SQLite, but the user asked for Neon. The app now lives in
the **`stock_db`** database on the `ep-twilight-frog-ahhz7bpn` endpoint.

**The database name matters as much as the host.** The `neondb` database on that
same endpoint belongs to the Scheduling app (`Faculty`, `ScheduleEvent`, …).
Every Neon project ships with a database called `neondb`, which makes connection
strings easy to mix up — this app was pointed at the wrong one once. If tables
appear to have vanished, check `select current_database()` before assuming data
loss.

Prisma needs both URLs: `DATABASE_URL` points at the pooled endpoint
(`-pooler` host, `pgbouncer=true` so prepared statements are disabled) and
`DIRECT_URL` at the unpooled one, because migrations cannot run through
PgBouncer.

## Migrations, not `db push`

The project started on `prisma db push` and moved to real migrations. That
switch cost a database reset: `migrate dev` saw tables with no migration
history, offered to reset, and the reset was accepted — dropping all data. Only
seed data was lost, but the same mistake against real share counts would be
unrecoverable.

Never accept a reset prompt. If migrate reports drift, baseline instead:
`migrate diff --from-empty --to-schema-datamodel` into a migration folder, then
`migrate resolve --applied`.

## Admin-managed users, still no public signup

The spec said "no signup page, no self-registration, ever" and specifically
rejected a UI form because a form implies a public entry point. `/users` is a UI
form, so it is worth being precise about why it does not violate that.

The property the spec protects is that **a person can only get access if someone
who already has it grants them access**. That holds: `/users` sits behind
`requireAdmin()`, every action re-checks it server-side, and the login page links
to nothing that creates a user. What is ruled out is a route an anonymous
visitor can reach to create their own account — that does not exist.

`isAdmin` is an explicit column rather than "the first user is admin", so
admin-ness is inspectable and revocable. Admins cannot demote or delete
themselves, which prevents locking the last admin out of user management.

Generated passphrases are shown exactly once, at creation, because they are
bcrypt-hashed immediately and cannot be read back.

## Page loads are budgeted in database round trips

Profiling a slow navigation found the cause was not the code: every query to
Neon takes **~1.29 s**, consistently, warm. The project is in `us-east-1` and is
used from India, and the connection pooler runs only about two queries
concurrently. A `select 1` costs 1.29 s; four sequential cost 6.4 s; a single
JOIN returning the whole portfolio costs 1.35 s.

So the optimisation target is the *count of sequential queries*, not query
complexity. Three changes took `/` and `/holdings` from ~6.8 s to ~1.45 s:

- The signed session cookie carries the user id, so identifying the caller needs
  no query. The user, their settings and their holdings load in one joined query
  (`relationLoadStrategy: "join"` — without it Prisma issues one query per
  relation, which measured *slower* than two parallel queries).
- That query is wrapped in React `cache`, so the layout (which needs the name
  for the sidebar) and the page (which needs holdings) share one trip.
- Price refreshes moved off the render path entirely (below).

**The real fix is geographic.** Moving the Neon project to `ap-south-1` would
turn 1.29 s into tens of milliseconds and make all of the above unnecessary.
Everything here is working around a database on the wrong continent.

## Price refreshes never block a render

`loadPortfolio` schedules stale-price refreshes with `after()`, which runs once
the response has been sent, and only revalidates if something actually changed.

This was found the hard way: a newly created user has 21 holdings with no cached
prices, and the old code awaited all 21 live fetches during render — the page
took over 30 seconds and timed out. Now it renders in ~3.5 s and the prices
appear on the next load.

The trade-off is that a refresh lands one navigation late. That is the right way
round for this app: the holdings table already labels how old each price is, so
a visibly stale number is honest, whereas a page hanging on a third-party API is
not. The Refresh button remains the awaited path for anyone who wants to wait.

## Theme: shadcn light/dark with a toggle

The original navy "ledger" palette was replaced with shadcn's stock light and
dark palettes plus a toggle (`next-themes`, class strategy, dark by default).

Two app-specific tokens survive the change because the portfolio needs a
meaning-carrying pair that neutral greys can't express: `--under` (amber, below
target weight) and `--over` (red, above it). Both are defined per theme, lifted
in dark mode for contrast.

Every colour now resolves through a CSS variable, including inside the Recharts
components. That is a hard requirement rather than tidiness — the charts
previously hardcoded hexes, which would have left them unreadable in light mode.

## Charts live with the holdings

The weight comparison and allocation donut moved from the dashboard to
`/holdings`, alongside the table they describe. The dashboard keeps the metric
cards and the buy-next ranking, which is the "what do I do now" view; the
charts are the "how is it distributed" view and belong next to the data.

Practical side effect: the dashboard's JS dropped from 108 kB to 2 kB, since
Recharts now only loads on the page that uses it.

## New users start with an empty portfolio

Originally every new account was seeded with the same 21 holdings. That was
wrong: a portfolio is a personal set of positions, and inheriting someone else's
picks makes the dashboard meaningless until they are all deleted. Seeding is now
removed from both the admin UI and `user:add`.

`SEED_STOCKS` is kept only because it was the bootstrap for the first account
and documents the original list. It should not be re-attached to user creation.

## Stock search rather than typing tickers

Adding a holding used to require knowing the exact NSE symbol, and a typo
produced a row that silently never priced. Holdings are now added through a
typeahead over the provider's symbol search.

Results are filtered to `NSI` (NSE) equities only. This matters more than it
looks: the same company is listed on several exchanges, and picking, say, the
NYSE line for Infosys would price the holding in dollars while the rest of the
portfolio is in rupees. Cached prices are shown inline in the dropdown, which is
usually free because the price cache is shared across users.

The search is a plain input plus a listbox rather than shadcn's `<Command>`,
because Command filters its items client-side and would re-filter a list the
server has already matched. Manual entry stays available for anything the
provider does not list.

The action is behind `requireUser()` — an open endpoint that proxies outbound
requests is an abuse vector regardless of how harmless the payload looks.

## Column headers explain themselves

Several columns are only interpretable once you know which total they are
measured against, and `gap` and `toBuy` deliberately use different denominators
— which is why a holding can be overweight and still need shares. That is
genuinely confusing, and a footnote would not be read at the moment of
confusion.

Each header is therefore a button opening a popover with a plain-English
definition, the formula, and a note where the column has a trap. Definitions
live in one map in `column-info.tsx`; they are prose, so nothing keeps them in
sync with `calc.ts` automatically — change both together.

## UI: shadcn/ui on Base UI

`shadcn init` installed the **Base UI**–backed components, not the older
Radix ones. The practical difference is composition: `render={<Link />}` instead
of `asChild`. Passing `asChild` is a type error, which is the fastest way to
notice.

The app is dark-only, so rather than maintaining a light palette that never
renders, the ledger colours are defined once and shadcn's semantic tokens
(`--background`, `--card`, `--primary`, `--sidebar`…) are mapped onto them in
`globals.css`. `.dark` is kept identical to `:root` so any component that scopes
itself to `.dark` cannot fall back to a light theme.

## Mobile: cards below `md`, table above

The holdings table has nine columns, six of them numeric. There is no way to
compress that to a 390px viewport without either horizontal scrolling or text
too small to read, so phones get a card per holding instead and the table
appears from `md` up.

Inline editors commit on **blur as well as Enter**: a numeric keypad on iOS has
no Enter key, so blur is the only reliable commit gesture there.

## Auth: signed cookie, no session table

A 30-day HMAC-signed `httpOnly` cookie holding `<userId>.<expiry>.<signature>`,
verified in [src/lib/session.ts](src/lib/session.ts). The signature covers the
expiry, so a client can't extend its own session.

No JWT library, no refresh rotation, no session store — for an allowlist of a few
people, one signed cookie checked against the users table each request is
proportionate. Revocation works by deleting the user row: `getSessionUser()`
re-reads the row on every request, so a valid signature alone isn't enough.

Passphrases are bcrypt-hashed at 12 rounds. Login runs a dummy bcrypt compare
when the name doesn't exist, so response timing doesn't reveal who's on the
allowlist, and the error message is identical for both failure modes.

## Users are created by CLI only

`npm run user:add` is the only way to create a user. There is deliberately no
signup route, because a signup form is a public entry point and this app is meant
to be private. Adding a user also seeds their 21 holdings so they land on a
working dashboard rather than an empty one.

## Prices cached in the database, not in memory

`PriceCache` is keyed by ticker and shared across all users, so one refresh
serves everyone and a redeploy doesn't lose the cache. A per-process in-memory
cache would be reset by every serverless cold start, which is most requests on a
low-traffic personal app.

## Fallback behaviour

A failed fetch keeps the last known price and its original timestamp rather than
blanking the row. The holdings table then labels the row's age (`3h old`,
`2d old`), so a stale number is visible as stale instead of silently wrong. The
dashboard's opportunistic refresh is wrapped in `.catch(() => null)` — a dead
price source must never take the page down.

## Sell signals are out of scope

`sharesToBuyNext` floors at zero, so an overweight holding shows `—` rather than
a negative quantity. Overweight positions are still visible: the gap column and
the weight chart both turn red. The spec scoped this to "which stock to buy
next", and a sell recommendation is a different (and more consequential) claim.
