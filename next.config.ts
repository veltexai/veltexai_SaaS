import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // .eslintrc.json was added for editor/CI linting, but the repo carries
    // pre-existing lint debt in legacy areas; don't let it fail `next build`.
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'vzhasjprwsvxpzbzyfsl.supabase.co',
      'iwoaaljitifloolszxlu.supabase.co',
    ],
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Absent locally and for contributors without a token: the plugin then skips
  // source map upload and the build still succeeds.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,

  widenClientFileUpload: true,

  // Proxy browser events through our own domain so ad blockers don't drop them.
  // `/monitoring` is excluded from the middleware matcher.
  tunnelRoute: '/monitoring',

  // Upload maps for readable stack traces, then strip them from the bundle so
  // they aren't publicly served.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  webpack: {
    // Drops Sentry's own debug logging from the client bundle.
    treeshake: {
      removeDebugLogging: true,
    },
  },

  _experimental: {
    // Registers Sentry cron check-ins for the crons declared in vercel.json
    // (currently /api/cron/trial-automation). This span-based strategy is the
    // one that supports the App Router — the older `automaticVercelMonitors`
    // option only instruments Pages Router API routes. Only activates during a
    // Vercel build (the SDK gates it on process.env.VERCEL).
    vercelCronsMonitoring: true,
  },
});
