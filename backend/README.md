# Backend

This package contains the Convex backend. From the repository root, run:

```sh
pnpm dev:backend
```

The first `convex dev` run signs in (if needed), creates or selects a Convex
project, writes `backend/.env.local`, and generates `backend/convex/_generated`.

## Authentication

The backend validates Clerk JWTs and every public query and mutation calls the
shared authentication guard before accessing the database. The guard also
requires the verified Clerk email to appear in `ALLOWED_USER_EMAILS`.

In Clerk, activate the Convex integration. Then open **Sessions → Claims** and
preserve the integration's `aud` claim while adding the primary email claim:

```json
{
  "aud": "convex",
  "email": "{{user.primary_email_address}}"
}
```

Copy the integration's issuer domain, configure it on the Convex development
deployment, then restart `convex dev` so the auth configuration is pushed:

```sh
pnpm --filter @moving/backend exec convex env set CLERK_JWT_ISSUER_DOMAIN https://your-instance.clerk.accounts.dev
pnpm --filter @moving/backend exec convex env set ALLOWED_USER_EMAILS peter@example.com,erin@example.com
pnpm dev:backend
```

Configure the production deployment separately with its production Clerk
issuer domain:

```sh
pnpm --filter @moving/backend exec convex env set --prod CLERK_JWT_ISSUER_DOMAIN https://clerk.your-domain.com
pnpm --filter @moving/backend exec convex env set --prod ALLOWED_USER_EMAILS peter@example.com,erin@example.com
pnpm --filter @moving/backend deploy
```

Keep Clerk in **Restricted** sign-up mode and invite only Peter and Erin. The
frontend also needs the matching Clerk publishable key as
`VITE_CLERK_PUBLISHABLE_KEY` in each hosting environment.
