export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://www.veltexai.com"
).replace(/\/$/, "");

export const SITE_NAME = "Veltex AI";

export const SITE_DESCRIPTION =
  "Cleaning proposal and bidding software for janitorial companies. Build accurate scopes, price jobs, and create professional proposals in minutes.";

export const SOCIAL_PROFILE_URLS = [
  process.env.NEXT_PUBLIC_FACEBOOK_URL,
  process.env.NEXT_PUBLIC_INSTAGRAM_URL,
  process.env.NEXT_PUBLIC_LINKEDIN_URL,
  process.env.NEXT_PUBLIC_YOUTUBE_URL,
].filter((url): url is string => Boolean(url && /^https:\/\//.test(url)));
