# Optional Accounts Architecture

This plan adds accounts without changing Caedora's core promise: a user can use
Caedora without an account, and vault contents remain in user-controlled storage
only. Accounts are for future identity-bound features such as subscriptions,
support, and optional GitHub account linking.

Last checked against public docs: 2026-06-29.

First implementation pass added: 2026-06-29.

## Decision

Use Clerk through the Vercel Marketplace as the account provider.

Why:

- It is the most Vercel-native option available for user accounts today.
- Vercel Marketplace can provision Clerk project environment variables for the
  Vercel project.
- Clerk provides Next.js App Router components and middleware, so Caedora does
  not need to build or operate an auth database.
- Clerk's current pricing page lists a free Hobby tier up to 50,000 monthly
  retained users, which is enough for the first account phase.
- Vercel's Hobby plan is free but intended for personal, non-commercial use. If
  subscriptions go live, we need to re-check Vercel plan requirements before
  launch.

Alternatives rejected for the first pass:

- Auth.js with a database: good open-source option, but it creates an account
  database we do not currently need.
- Auth0 or Descope: viable, but less aligned with the Vercel Marketplace-first
  path than Clerk for this project.
- A custom auth system: unnecessary risk and maintenance burden.

## Privacy Boundary

The account layer must not become vault storage.

Caedora stores:

- Markdown vault content: local folder, browser storage bundle, or the user's
  GitHub repository.
- Local vault connection state: IndexedDB in the browser/Electron origin.
- GitHub App access tokens today: IndexedDB, not Caedora infrastructure.

Caedora should not store:

- Markdown note content on Caedora servers.
- File paths, note titles, note bodies, embeddings, or vault indexes in an
  account database.
- GitHub PATs in localStorage, cookies, or Caedora server storage.

The first account release should introduce no Caedora-owned database. Clerk will
store the identity record and session state. Caedora server code should only read
the signed-in user when an account-only feature is requested.

If we later need our own account metadata, keep it to the minimum:

```ts
type AccountMetadata = {
  clerkUserId: string
  createdAt: string
  plan: 'free' | 'paid'
  billingCustomerId?: string
  githubUserId?: string
  githubInstallationIds?: number[]
}
```

Do not add vault identifiers, vault content, paths, note names, or tokens to this
record.

## Route Model

All core vault routes stay public:

- `/`
- `/vault`
- `/vault/[...path]`
- `/download`
- `/settings`

Account routes can be protected:

- `/account`
- `/billing`
- `/api/account/*`
- `/api/billing/*`

GitHub vault connection routes stay no-store and account-optional:

- `/api/github/start`
- `/api/github/setup`
- `/api/github/callback`
- `/api/github/refresh`
- `/api/github/repositories`

This means a signed-out user can still open a local folder, create a browser
vault, or connect GitHub using the existing flow.

## Desktop Apps

The no-account architecture works for the macOS and Windows desktop apps because
the desktop bundle hosts the same standalone Next.js app locally. Core vault
usage must stay account-free, so desktop users can keep using local folders,
browser vaults, Argus, and GitHub vaults without signing in.

Do not make Clerk a hard dependency for desktop startup or vault access.

Optional desktop sign-in needs extra design. The packaged Electron app serves
the web app from `http://127.0.0.1:<available-port>`, and the main process opens
external URLs in the user's system browser. That is good for safety, but it means
browser-based OAuth redirects and Electron session cookies do not automatically
behave like the hosted `https://caedora.app` site.

Recommended first desktop approach:

- Keep account management web-first at `https://caedora.app/account`.
- In desktop, show "Manage account" or "Sign in" as an external browser action.
- Do not gate desktop features on the embedded Electron window knowing the Clerk
  session.
- If a future desktop-only paid feature needs local entitlement checks, add a
  deliberate device-linking flow instead of relying on ad hoc localhost OAuth
  redirects.

Future desktop device-linking shape:

1. User clicks "Link this desktop app".
2. Desktop opens `https://caedora.app/device` in the system browser.
3. The hosted web app requires Clerk sign-in and shows a short-lived code.
4. Desktop exchanges that code for a minimal entitlement token.
5. The token is stored in the OS keychain or Electron-safe encrypted storage.
6. The token contains account id and plan/entitlement only, never vault content
   or GitHub repository data.

This keeps the desktop app compatible with free account tiers while avoiding
fragile redirect URI setup for every local desktop port.

## Implementation Shape

Implemented in this branch:

- Optional `ClerkProvider` in `app/layout.tsx`, guarded by
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.
- `middleware.ts` protects only account and billing routes, and no-ops until
  both Clerk public and secret keys are configured.
- `/sign-in`, `/sign-up`, and `/account` routes.
- Account entry points in the landing header, vault sidebar, and settings dialog.
- Desktop account management links to the hosted account page instead of using
  random localhost OAuth redirects.

Setup still required:

1. Install Clerk via Vercel Marketplace and keep the Clerk project on its free
   Hobby tier while account usage is low.
2. Configure supported sign-in methods in Clerk: email first, then GitHub and
   Google.
3. Keep vault state in `lib/vault-context.tsx` and `lib/storage/idb.ts`
   unchanged. The account layer must not become a dependency of
   `VaultProvider`.
4. Add e2e coverage that proves the no-account flow still works.

Example middleware shape:

```ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isAccountRoute = createRouteMatcher([
  '/account(.*)',
  '/billing(.*)',
  '/api/account(.*)',
  '/api/billing(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (isAccountRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

## GitHub Linking

Keep the existing GitHub App vault connection as the default. It already returns
tokens to the browser and stores them in IndexedDB.

If a signed-in user later chooses "Link GitHub account", treat that as identity
metadata, not vault sync:

- Use Clerk social connection or the existing GitHub App OAuth depending on the
  feature needed.
- Store at most GitHub user id and installation ids.
- Keep access and refresh tokens out of Caedora server storage unless a future
  feature absolutely requires server-side GitHub actions.
- Never infer or store repo contents.

## Future Billing

Do not build billing in the first account pass. The account system should only
make a future billing feature possible.

When subscriptions are ready:

- Prefer Clerk Billing if it still fits the Vercel Marketplace path.
- Gate only paid features, not basic vault access.
- Store billing state in Clerk/payment-provider metadata where possible.
- If a Caedora database becomes unavoidable, use a Vercel Marketplace database
  on its free tier for development and keep the schema to account metadata only.
- Re-check Vercel plan terms before accepting payments, because commercial use
  may not fit the Hobby plan.

## Manual Setup Steps

1. In Vercel, open the Caedora project.
2. Go to Marketplace and install Clerk for the project.
3. Choose "Create New Clerk Account" unless there is already a Clerk account to
   connect.
4. Stay on Clerk's free Hobby plan.
5. Confirm these environment variables exist on the Vercel project:
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
6. Pull the variables locally with `vercel env pull .env.local`, or copy them
   into `.env.local` manually.
7. In Clerk, set allowed URLs for local development and production:
   `http://localhost:3000` and `https://caedora.app`.
8. Set sign-in and sign-up URLs:
   `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and
   `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`.
9. If enabling GitHub as a sign-in option, configure GitHub OAuth credentials in
   Clerk for production. This is separate from the existing GitHub App vault
   access.
10. After implementation, verify signed-out local vault and GitHub vault flows
    still work before testing signed-in account routes.
11. For desktop builds, do not add Clerk redirect URLs for random localhost
    ports. Use the hosted account page first, then design a device-linking flow
    only when desktop needs account entitlements.

## Docs Checked

- https://vercel.com/marketplace/clerk
- https://vercel.com/pricing
- https://clerk.com/pricing
- https://clerk.com/docs/deployments/vercel
- https://clerk.com/docs/quickstarts/nextjs
- https://nextjs.org/docs/app/guides/authentication
