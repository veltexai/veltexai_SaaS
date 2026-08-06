This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PostHog analytics

PostHog is disabled unless all three variables below are configured. Keep it
disabled for normal local development and enable it explicitly in production:

```bash
NEXT_PUBLIC_POSTHOG_ENABLED=true
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_token
NEXT_PUBLIC_POSTHOG_HOST=https://your-posthog-ingestion-host
```

The project token is intended for client use; do not configure a PostHog
personal API key in the application. Session Replay runs only in production on
the activation-route allowlist and masks all inputs, URL query strings,
generated proposals, and proposal-detail content.

## Sentry error monitoring

Sentry is fully disabled unless `NEXT_PUBLIC_SENTRY_DSN` is set — leave it unset
for normal local development and the app behaves exactly as before.

```bash
# Runtime (set in Vercel for every environment)
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>

# Build-time only, needed for readable stack traces (Vercel env vars)
SENTRY_ORG=your-sentry-org-slug
SENTRY_PROJECT=your-sentry-project-slug
SENTRY_AUTH_TOKEN=sntrys_...   # mark as a secret
```

Without `SENTRY_AUTH_TOKEN` the build still succeeds; it just skips source map
upload, so production stack traces stay minified.

Notes:

- Environment separation uses Vercel's automatic `VERCEL_ENV`, so no extra
  variable is needed to keep production and preview events apart.
- Traces are sampled at 10% in production and 100% elsewhere.
- `sendDefaultPii` is off and only the Supabase user id is attached to events —
  no emails, IPs, cookies, or request bodies are sent.
- Session Replay is deliberately not enabled; PostHog already records sessions.
- Browser events tunnel through `/monitoring` on this domain so ad blockers
  don't drop them. That path is excluded from the middleware matcher.
- Cron check-ins for `vercel.json` crons register automatically via
  `_experimental.vercelCronsMonitoring`. This only activates on a Vercel build
  (the SDK gates it on `process.env.VERCEL`), so it is inert locally.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
