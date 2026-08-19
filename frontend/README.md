# Frontend

This is a React + Vite + TypeScript frontend. The Convex backend lives in
`../backend`.

```sh
cp .env.example .env.local
pnpm dev:backend # in another terminal; copy the generated Convex URL
pnpm dev:frontend
```

Set both client variables in `.env.local`:

```sh
VITE_CONVEX_URL=https://your-convex-deployment.convex.cloud
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

When both are present, Clerk signs the user in and
`ConvexProviderWithClerk` sends the resulting JWT to Convex. If only one is
present, the app fails closed with a configuration error. When neither is
present, the existing local preview mode remains available without a backend.

The sign-in screen deliberately has no public sign-up link. Configure the
Clerk application in **Restricted** sign-up mode and invite Peter and Erin from
the Clerk dashboard.

## UI

Tailwind CSS v4 and shadcn/ui are configured with the Radix base. Components
are added to `src/components/ui` and can be customized directly. For example:

```sh
pnpm dlx shadcn@latest add dialog
```

The design system — fonts, colour ramps, the move category palette, type scale,
elevation and motion — is documented in [DESIGN.md](./DESIGN.md) and defined as
CSS custom properties in `src/index.css`, so shadcn components inherit it.

Browse it at `/#design` while the dev server is running, and check colour
contrast with:

```sh
pnpm check:contrast
```
