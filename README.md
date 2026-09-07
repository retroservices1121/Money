# Money Moves v0.5

Money Moves is a mobile-first household cash-flow operating system. It connects live bank data through Plaid, applies deterministic household rules, and answers the question: **what should we do with the money we have right now?**

## v0.5 features

- Live Plaid balances and `/transactions/sync`
- Bill-aware decision engine with checking floor + 1st-of-month holdback + 15th reserve
- Safe-to-spend number
- Payday Mode and 1st-of-month deposit detection
- Daily spend report and discretionary pacing
- Morning Money Brief
- Bill runway and funding checkpoint
- Operating surplus and monthly savings target
- Weekly Money Moves report
- Month-end savings scorecard
- Subscription detection and price-change flags
- Unusual-spend detection
- Merchant intelligence with household correction rules
- 30-day cash-flow forecast
- Configurable savings routing
- Household activity log with per-device member names
- Optional Web Push for morning, weekly, payday, pace, cap, and unusual-spend alerts
- Optional private-beta household access key

## Household plan currently encoded

- Spendable income: `$11,659/mo`
- Planned expenses: `$7,991/mo`
- Operating surplus: `$3,668/mo`
- Savings buffer: `$1,089/mo`
- Total savings/investing target: `$4,757/mo`
- Guaranteed VA + Coast Guard income: `$7,053` on the 1st
- 1st bills bucket: `$4,862.76`
- 15th bills reserve: `$2,552.10`
- Checking floor: `$1,000`
- Discretionary cap: `$850/mo`
- Normal civilian paycheck: `$2,303` biweekly

The app does **not** initiate bank transfers. Recommendations remain advisory and auditable.

## Stack

- Node.js 22 built-in HTTP server
- Node `node:sqlite`
- Plaid API via direct `fetch`
- SQLite on a persistent Railway volume
- Vanilla PWA
- Optional `web-push` / VAPID

## Railway variables

Use a persistent Railway volume mounted at `/data` and set:

```text
DB_PATH=/data/money-moves.db
NODE_ENV=production
PORT=8080

PLAID_ENV=production
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_REDIRECT_URI=https://YOUR-DOMAIN/oauth.html
PLAID_WEBHOOK_URL=https://YOUR-DOMAIN/api/plaid/webhook
BANK_TOKEN_ENCRYPTION_KEY=...

VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com

MONEY_MOVES_ACCESS_KEY=use-a-long-household-password
SESSION_SECRET=use-a-separate-long-random-secret
```

`MONEY_MOVES_ACCESS_KEY` is optional in code so development does not lock itself out, but it is strongly recommended whenever the deployment contains real financial data. `SESSION_SECRET` signs the 30-day household session cookie.

Do not rotate `BANK_TOKEN_ENCRYPTION_KEY` casually after Plaid Items have been linked because it encrypts stored Plaid access tokens.

## Plaid

The app creates a Link token with the Transactions product, uses the configured OAuth redirect URI, encrypts the returned Plaid access token, refreshes balances, and incrementally syncs transactions. Plaid `TRANSACTIONS / SYNC_UPDATES_AVAILABLE` webhooks trigger another sync and recomputation.

## Merchant rules

The built-in beta classifier currently treats:

- Walmart as groceries
- Amazon as discretionary
- JBA Andrews Main Store as discretionary
- 7-Eleven / 7-11 `<= $30` as discretionary
- 7-Eleven / 7-11 `> $30` as gas
- dining, entertainment, barber/salon/nails/spa as discretionary
- pending transactions, transfers, loan payments, and credit-card payments as excluded from spending totals

The dashboard lets the household correct a merchant to `discretionary`, `groceries`, `gas`, `essential`, or `ignore`. Corrections are persisted and reports recalculate immediately.

## Decision safety

The engine protects cash in this order:

1. Unconfirmed 1st-of-month bills holdback
2. `$1,000` checking floor
3. 15th reserve target
4. True excess cash available for savings routing

The 1st-of-month bills holdback remains protected until a household member marks those bills paid for the month. This prevents the app from sweeping money that may still be needed for the first bill bucket.

## Push alerts

With VAPID configured, a device can tap **Enable alerts** to subscribe. The server can send:

- Morning Money Brief around 8 AM Eastern
- Saturday weekly summary around 8 AM Eastern
- Payday detection
- Discretionary pace alerts
- Discretionary-cap alerts
- Unusual-spend alerts

## Tests

```bash
npm install
npm test
```

Tests cover the decision engine, insights/classification logic, and legacy bank classification rules.

## Before a public launch

This remains a private household beta. A public multi-tenant version still needs real user/household authentication, CSRF protection, rate limiting, managed database migrations, backups, monitoring, privacy/deletion workflows, legal/compliance review, and production-grade tenant isolation.
