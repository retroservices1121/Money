# Money Moves v0.3

Money Moves is a mobile-first shared household cash-flow assistant. This beta adds a live bank-data integration layer using Plaid, while keeping money-movement recommendations deterministic and auditable.

## What v0.3 adds

- Plaid Link bank connection flow
- Mobile OAuth return handling for institutions that require OAuth
- Server-side encrypted storage of Plaid access tokens
- Live account balance refresh
- Incremental transaction sync with `/transactions/sync`
- Plaid transaction webhooks for background updates
- Plaid webhook signature verification using `Plaid-Verification`
- Household account mapping for checking / bills reserve / long-term savings
- Automatic Navy Federal mask mapping for the beta accounts ending 1174, 9384, and 3051 when those masks are available
- Automatic discretionary-spend calculation from synced transactions
- Household-specific transaction classification rules
- Shared household alerts after bank syncs and material spending changes
- Existing shared household invitations, completion state, activity log, PWA install support, and optional Web Push

## Safety model

This beta is **read-only with respect to bank money movement**. It can read balances and transactions through Plaid and recommend exact transfers, but it does not initiate ACH transfers or move money.

The recommendation engine is deterministic. AI can be layered on later for explanations and ambiguous transaction review, but exact transfer amounts should continue to come from auditable rules.

## Stack

- Node.js + Express
- SQLite via `better-sqlite3`
- Plaid Node SDK
- Web Push / VAPID
- Vanilla mobile-first PWA
- Railway-ready Docker deployment

## Local development

```bash
cp .env.example .env
npm install
npm test
npm start
```

Then open `http://localhost:8080`.

Without Plaid credentials the rest of the app still works, but the bank-link endpoints will report that Plaid is not configured.

## Plaid setup

Create a Plaid application and enable the products you need for the beta. At minimum this build expects `transactions`; it also requests `auth` because it is useful for future money-movement features.

Set:

```bash
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=sandbox
PLAID_REDIRECT_URI=https://YOUR-DOMAIN/oauth.html
PLAID_WEBHOOK_URL=https://YOUR-DOMAIN/api/plaid/webhook
```

For initial development use `sandbox`. Move to `production` only after Plaid approves the application and the required institutions/products.

### OAuth redirect

For mobile web OAuth, register the exact HTTPS redirect URI with Plaid and set it as `PLAID_REDIRECT_URI`. The included `oauth.html` stores the received OAuth return URI and routes the user back to the app so Plaid Link can resume the original Link session.

## Encryption key

Plaid access tokens are encrypted before they are stored in SQLite. Generate a 32-byte key:

```bash
openssl rand -base64 32
```

Set the result as:

```bash
BANK_TOKEN_ENCRYPTION_KEY=...
```

Do not rotate this key without a migration plan for already-linked Items.

## Web Push

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Set:

```bash
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

On iPhone, Web Push requires a supported iOS version and the PWA should be added to the Home Screen.

## Railway deployment

The included `Dockerfile` and `railway.json` are ready for Railway.

Recommended Railway variables:

```bash
NODE_ENV=production
PORT=8080
DATA_DIR=/data
APP_BASE_URL=https://YOUR-DOMAIN
PLAID_CLIENT_ID=...
PLAID_SECRET=...
PLAID_ENV=production
PLAID_REDIRECT_URI=https://YOUR-DOMAIN/oauth.html
PLAID_WEBHOOK_URL=https://YOUR-DOMAIN/api/plaid/webhook
BANK_TOKEN_ENCRYPTION_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
```

Attach a persistent Railway volume at `/data` so the SQLite database survives deployments.

## Bank sync behavior

When a bank is linked:

1. Money Moves creates a Plaid Link token.
2. The browser opens Plaid Link.
3. The public token is exchanged server-side.
4. The permanent access token is encrypted at rest.
5. Account balances are fetched.
6. Transactions are incrementally synchronized.
7. Account roles are automatically mapped where possible.
8. The deterministic household engine recomputes the current Money Moves plan.
9. Household members see the same state and can receive a push notification.

Plaid webhooks call `/api/plaid/webhook`. For transaction updates, the server runs another incremental sync and refreshes the household plan.

## Household beta rules

The seed household uses:

- Checking floor: `$1,000`
- 15th reserve target: `$2,552.10`
- Monthly discretionary cap: `$850`
- Budget-eligible VA: `$4,158`
- Normal civilian paycheck: `$2,303`

The beta classifier currently applies these household rules:

- Walmart → groceries, excluded from discretionary
- Amazon → discretionary
- JBA Andrews Main Store → discretionary
- 7-Eleven / 7-11 at or under `$30` → discretionary convenience purchase
- 7-Eleven / 7-11 over `$30` → vehicle gas, excluded from discretionary
- Dining / restaurants / fast food → discretionary
- Entertainment / movie theaters → discretionary
- Haircuts / barber / salon / nails → discretionary
- Internal transfers and credit-card payments → excluded
- Pending transactions → excluded until posted

The transaction page allows the owner to override an individual transaction if Plaid or the beta classifier gets it wrong.

## Important production work before public launch

This is appropriate for a private household beta, not yet a public financial product. Before opening it to outside customers, add at minimum:

- Real user authentication instead of local household tokens
- Stronger household authorization and device/session management
- CSRF protection and request-rate controls
- Central secrets management / key rotation
- Structured audit logging
- Database migrations and managed Postgres
- Privacy policy / terms / data deletion workflows
- Plaid production review and institution coverage testing
- Monitoring, alerting, backups, and incident response
- Legal/compliance review of the exact product behavior and marketing claims
- A formal policy for transaction classification and recommendation errors

## Tests

```bash
npm test
```

The tests cover the deterministic payday allocation engine and the household transaction-classification rules.

## Core principle

A bank balance is not the same thing as spendable money.

Money Moves should answer the more useful household question:

> What should we do with the money we have right now?
