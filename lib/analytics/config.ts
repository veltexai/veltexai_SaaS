const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;

export const isPostHogEnabled =
  process.env.NEXT_PUBLIC_POSTHOG_ENABLED === "true" &&
  Boolean(POSTHOG_KEY) &&
  Boolean(POSTHOG_HOST);

export const postHogConfig = {
  key: POSTHOG_KEY,
  host: POSTHOG_HOST,
} as const;
