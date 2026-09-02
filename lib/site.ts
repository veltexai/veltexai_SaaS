export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://www.veltexai.com"
).replace(/\/$/, "");

export const SITE_NAME = "Veltex AI";

export const SITE_DESCRIPTION =
  "Cleaning proposal and bidding software for janitorial companies. Build accurate scopes, price jobs, and create professional proposals in minutes.";
