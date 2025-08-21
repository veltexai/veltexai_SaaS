import config from '@/config/config';

export const AUTH_ROUTES = {
  LOGIN: '/auth/login',
  SIGNUP: '/auth/signup',
  DASHBOARD: '/dashboard',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
} as const;

export const AUTH_REDIRECTS = {
  CALLBACK: `${config.domainName}/api/auth/callback`,
  CONFIRM: `${config.domainName}/api/auth/confirm`,
  DEFAULT_REDIRECT: AUTH_ROUTES.DASHBOARD,
} as const;

export const AUTH_PROVIDERS = {
  GOOGLE: 'google',
} as const;

export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: 'Invalid credentials. Please try again.',
  USER_EXISTS: 'User already exists.',
  SIGNUP_FAILED: 'Failed to create user. Please try again.',
  GOOGLE_SIGNIN_FAILED: 'Failed to sign in with Google. Please try again.',
  SESSION_INIT_FAILED: 'Failed to initialize session',
  NO_USER: 'No user logged in',
} as const;
