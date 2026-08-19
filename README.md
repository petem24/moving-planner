# Moving Planner

A small app for organising our move.

It keeps track of tasks, notes, and everything we plan to sell, ship, donate, store, or throw away.

## Development

```sh
pnpm install
pnpm dev
```

The frontend is built with React and Vite, with Convex providing the backend.

## Production deployment

Production is deployed manually from the **Deploy production** GitHub Actions
workflow. The workflow deploys the Convex backend, builds the frontend against
that production deployment, and publishes the Vite output as Cloudflare Worker
static assets.

Create one GitHub environment named `production` and add these environment
secrets before running the workflow:

```text
CONVEX_DEPLOY_KEY
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
VITE_CLERK_PUBLISHABLE_KEY
```

- Create `CONVEX_DEPLOY_KEY` for the Convex production deployment with the
  `deployment:deploy` permission.
- Create a Cloudflare API token from the **Edit Cloudflare Workers** template,
  scoped to the account that will host `moving-planner`.
- Use the publishable key from the Clerk production instance (`pk_live_...`).

The Convex production deployment must also have `CLERK_JWT_ISSUER_DOMAIN` and
`ALLOWED_USER_EMAILS` configured as described in
[`backend/README.md`](backend/README.md). After the first deployment, attach the
chosen custom domain to the `moving-planner` Worker in Cloudflare and configure
that same application domain in Clerk.
