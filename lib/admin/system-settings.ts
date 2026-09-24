import { SystemSettings } from '@/types/database';

type StoredSystemSettings = Record<string, unknown>;

const FORM_TO_STORAGE_ALIASES: Record<string, string> = {
  email_from_name: 'smtp_from_name',
  email_from_address: 'smtp_from_email',
  ai_enabled: 'enable_ai_suggestions',
  email_notifications_enabled: 'enable_email_notifications',
  business_timezone: 'default_timezone',
};

export const EDITABLE_SYSTEM_SETTING_COLUMNS = [
  'company_name', 'company_logo_url', 'company_tagline',
  'primary_color', 'secondary_color', 'accent_color',
  'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
  'smtp_from_email', 'smtp_from_name',
  'session_timeout', 'password_min_length', 'require_2fa', 'max_login_attempts',
  'enable_ai_suggestions', 'enable_auto_backup',
  'enable_email_notifications', 'enable_sms_notifications',
  'default_currency', 'default_timezone',
  'business_hours_start', 'business_hours_end',
  'maintenance_mode', 'maintenance_message',
  'theme_applied_to_pdfs', 'ai_attribution_enabled', 'proposal_tracking_enabled',
] as const;

export function mapStoredSystemSettingsToForm(
  stored: StoredSystemSettings,
  defaults: SystemSettings,
): SystemSettings {
  return {
    ...defaults,
    ...stored,
    email_from_name: String(stored.smtp_from_name ?? defaults.email_from_name),
    email_from_address: String(stored.smtp_from_email ?? defaults.email_from_address),
    ai_enabled: Boolean(stored.enable_ai_suggestions ?? defaults.ai_enabled),
    email_notifications_enabled: Boolean(
      stored.enable_email_notifications ?? defaults.email_notifications_enabled,
    ),
    business_timezone: String(stored.default_timezone ?? defaults.business_timezone),
    smtp_password: null,
  } as SystemSettings;
}

export function buildSystemSettingsUpdate(
  submitted: StoredSystemSettings,
  preserveSmtp = false,
): StoredSystemSettings {
  const update: StoredSystemSettings = {};

  for (const key of EDITABLE_SYSTEM_SETTING_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(submitted, key)) update[key] = submitted[key];
  }
  for (const [input, column] of Object.entries(FORM_TO_STORAGE_ALIASES)) {
    if (Object.prototype.hasOwnProperty.call(submitted, input)) update[column] = submitted[input];
  }

  if (preserveSmtp) {
    for (const key of [
      'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
      'smtp_from_email', 'smtp_from_name',
    ]) delete update[key];
  } else if (typeof submitted.smtp_password !== 'string' || submitted.smtp_password.trim() === '') {
    delete update.smtp_password;
  }

  return update;
}
