#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const migrationsDir = resolve(root, "supabase/migrations");
const outputDir = resolve(process.argv[2] ?? "/private/tmp/veltex-r2-prerequisite-replay");
const allowedOutputName = /^veltex-r2-prerequisite-replay(?:-[A-Za-z0-9._]+)?$/;
const splitTransactionMigration = "20260913000000_commercial_quick_weekly_frequencies.sql";

if (dirname(outputDir) !== "/private/tmp" || !allowedOutputName.test(basename(outputDir))) {
  throw new Error(`Refusing unsafe replay output directory: ${outputDir}`);
}

// This is deliberately explicit. A changed chain must be reviewed, not inferred.
const baselineVersions = [
  "001", "002", "003", "004", "005", "006", "009", "010", "011", "012",
  "013", "014", "015", "016", "017", "018", "019", "020", "021", "022",
  "023", "024", "025", "026", "027", "028", "029", "030", "20250901194222",
];

const steps = [
  ["031_enhance_addon_catalog.sql", [
    "(select count(*) from information_schema.columns where table_schema='public' and table_name='additional_service_catalog' and column_name in ('category','show_in_proposals','description','notes')) = 4",
    "to_regclass('public.idx_additional_service_catalog_category') is not null",
  ]],
  ["032_fix_addon_catalog_rls.sql", [
    "exists (select 1 from pg_policies where schemaname='public' and tablename='additional_service_catalog' and policyname='Admins can manage add-on catalog')",
    "exists (select 1 from pg_policies where schemaname='public' and tablename='proposal_additional_services' and policyname='Admins can manage proposal add-ons')",
  ]],
  ["033_7_day_trial_system.sql", [
    "to_regprocedure('public.start_user_trial(uuid,text)') is not null",
    "to_regprocedure('public.get_user_usage_info(uuid)') is not null",
    "exists (select 1 from pg_constraint where conname='profiles_subscription_status_check')",
  ]],
  ["034_free_trial_no_credit_card.sql", [
    "position('free_trial' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0",
    "position('free_trial' in pg_get_functiondef('public.can_user_create_proposal(uuid)'::regprocedure)) > 0",
  ]],
  ["035_email_automation_log.sql", [
    "to_regclass('public.email_automation_log') is not null",
    "exists (select 1 from pg_policies where schemaname='public' and tablename='email_automation_log' and policyname='Service role only')",
  ]],
  ["036_add_company_profile_fields.sql", [
    "(select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('company_founded_date','industries_served','satisfaction_guarantee')) = 3",
  ]],
  ["037_marketing_attribution.sql", [
    "to_regclass('public.marketing_attribution') is not null",
    "to_regclass('public.marketing_funnel_events') is not null",
    "exists (select 1 from pg_trigger where tgname='proposals_first_proposal_funnel_event' and not tgisinternal)",
  ]],
  ["038_calculator_estimate_capture.sql", [
    "to_regclass('public.calculator_estimate_requests') is not null",
    "exists (select 1 from pg_class where oid='public.calculator_estimate_requests'::regclass and relrowsecurity)",
  ]],
  ["039_acquisition_attribution_funnel.sql", [
    "to_regclass('public.acquisition_conversion_funnel') is not null",
    "to_regprocedure('public.record_proposal_funnel_event()') is not null",
    "exists (select 1 from pg_trigger where tgname='proposals_acquisition_funnel_event' and not tgisinternal)",
  ]],
  ["040_executive_premium_trial_experience.sql", [
    "to_regprocedure('public.can_user_access_template(uuid,uuid)') is not null",
    "has_function_privilege('authenticated','public.can_user_access_template(uuid,uuid)','EXECUTE')",
    "not exists (select 1 from pg_proc p cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl where p.oid='public.can_user_access_template(uuid,uuid)'::regprocedure and acl.grantee=0 and acl.privilege_type='EXECUTE')",
  ]],
  ["041_growth_qualification_and_funnel.sql", [
    "to_regclass('public.growth_funnel_daily') is not null",
    "(select count(*) from information_schema.columns where table_schema='public' and table_name='profiles' and column_name in ('buyer_role','cleaning_business_type','bids_per_month_bucket','qualified_at','is_internal')) = 5",
    "exists (select 1 from pg_trigger where tgname='profiles_classify_internal' and not tgisinternal)",
  ]],
  ["20260908000000_enforce_proposal_design_entitlements.sql", [
    "to_regprocedure('public.enforce_proposal_design_entitlement()') is not null",
    "to_regprocedure('public.protect_profile_entitlements()') is not null",
    "exists (select 1 from pg_trigger where tgname='profiles_protect_entitlements' and not tgisinternal)",
  ]],
  ["20260913000000_commercial_quick_weekly_frequencies.sql", [
    "exists (select 1 from pg_constraint where conname='proposals_service_frequency_check' and convalidated and position('4x-week' in pg_get_constraintdef(oid)) > 0 and position('6x-week' in pg_get_constraintdef(oid)) > 0)",
  ]],
  ["20260922000000_service_catalog_release_1.sql", [
    "to_regclass('public.service_catalog_versions') is not null",
    "to_regclass('public.business_service_profiles') is not null",
    "exists (select 1 from pg_trigger where tgname='proposal_catalog_version_guard' and not tgisinternal)",
  ]],
  ["20260922010000_catalog_remediation.sql", [
    "to_regprocedure('public.get_proposal_tracking_stats(uuid)') is not null",
    "to_regprocedure('public.read_tracked_proposal(text)') is not null",
    "exists (select 1 from pg_policies where schemaname='public' and tablename='proposal_tracking' and policyname='catalog_owner_guard')",
  ]],
  ["20260924000000_r0_privilege_hardening.sql", [
    "to_regprocedure('public.r0_assert_self_or_service(uuid)') is not null",
    "to_regprocedure('public._r0_can_user_create_proposal_impl(uuid)') is not null",
    "has_function_privilege('authenticated','public.can_user_create_proposal(uuid)','EXECUTE')",
    "not has_function_privilege('anon','public.can_user_create_proposal(uuid)','EXECUTE')",
    "not has_function_privilege('anon','public.can_user_access_template(uuid,uuid)','EXECUTE')",
  ]],
  ["20260924010000_restrict_legacy_proposal_view.sql", [
    "to_regclass('public.enhanced_proposals') is not null",
    "(select reloptions @> array['security_invoker=true'] from pg_class where oid='public.enhanced_proposals'::regclass)",
    "has_table_privilege('service_role','public.enhanced_proposals','SELECT')",
    "not has_table_privilege('authenticated','public.enhanced_proposals','SELECT')",
  ]],
  ["20260924010500_fix_profiles_policy_recursion.sql", [
    "exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='Admins can view all profiles' and coalesce(qual,'') like '%is_admin%')",
  ]],
  ["20260924011000_align_profiles_branding_columns.sql", [
    "exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='logo_url')",
  ]],
  ["20260924012000_align_tracking_delivery_methods.sql", [
    "exists (select 1 from pg_constraint where conname='proposal_tracking_delivery_method_check' and position('pdf_only' in pg_get_constraintdef(oid)) > 0 and position('online_only' in pg_get_constraintdef(oid)) > 0)",
  ]],
  ["20260924013000_sync_tracked_engagement_fields.sql", [
    "to_regprocedure('public.record_tracked_view(text)') is not null",
    "to_regprocedure('public.record_tracked_download(text)') is not null",
    "to_regprocedure('public.record_tracking_click(text,text,text,text)') is not null",
    "to_regprocedure('public.tracked_proposal_has_paid_access(text)') is not null",
  ]],
  ["20260925000000_location_pricing_foundation.sql", [
    "(select count(*) from pg_class where oid in ('public.pricing_source_versions'::regclass,'public.geographic_pricing_markets'::regclass,'public.occupational_wage_benchmarks'::regclass,'public.minimum_wage_rules'::regclass,'public.regional_price_parities'::regclass,'public.mileage_rate_versions'::regclass) and relrowsecurity) = 6",
    "exists (select 1 from pg_policies where schemaname='public' and tablename='pricing_source_versions' and policyname='pricing_benchmarks_authenticated_read')",
  ]],
  ["20260925001000_location_pricing_reviewed_seed.sql", [
    "exists (select 1 from public.pricing_source_versions where dataset_key='bls_oews_national_cleaning' and version='2025-05' and active)",
    "exists (select 1 from public.geographic_pricing_markets where market_code='US-NATIONAL' and state_code is null and resolution='national')",
    "exists (select 1 from public.mileage_rate_versions where dataset_version='us-location-2026-09-25.1' and business_rate=0.76)",
  ]],
];

const versionOf = (file) => file.split("_", 1)[0];
const nameOf = (file) => file.replace(/^\d+_/, "").replace(/\.sql$/, "");
const sha256 = (text) => createHash("sha256").update(text).digest("hex");
const sqlList = (values) => values.map((value) => `'${value}'`).join(", ");

function migrationBody(source, file) {
  const begins = source.match(/^\s*begin\s*;\s*$/gim) ?? [];
  const commits = source.match(/^\s*commit\s*;\s*$/gim) ?? [];
  if (begins.length !== commits.length || begins.length > 1) {
    throw new Error(`${file} has unsupported transaction boundaries`);
  }
  if (begins.length === 0) return source.trim();
  return source.replace(/^\s*begin\s*;\s*$/im, "").replace(/^\s*commit\s*;\s*$/im, "").trim();
}

if (new Set(steps.map(([file]) => versionOf(file))).size !== steps.length) {
  throw new Error("Replay plan contains duplicate migration versions");
}
if (steps[3][0] !== "034_free_trial_no_credit_card.sql") {
  throw new Error("Replay plan must use canonical 034_free_trial_no_credit_card.sql");
}

if (existsSync(outputDir)) {
  const existing = readdirSync(outputDir);
  const priorManifest = resolve(outputDir, "manifest.json");
  if (!existsSync(priorManifest)) {
    throw new Error(`Refusing to replace replay directory without its manifest: ${outputDir}`);
  }
  const parsed = JSON.parse(readFileSync(priorManifest, "utf8"));
  if (parsed.target !== "isolated preview ynzkwctwlssjcsjmahey"
      || parsed.productionAuthorized !== false
      || !Array.isArray(parsed.steps)) {
    throw new Error(`Refusing to replace replay directory with an unexpected manifest: ${outputDir}`);
  }
  const expectedFiles = new Set(["manifest.json", ...parsed.steps.map((step) => step.artifact)]);
  if (existing.length !== expectedFiles.size || existing.some((name) => !expectedFiles.has(name))) {
    throw new Error(`Refusing to replace replay directory with unexpected or missing generated files: ${outputDir}`);
  }
}
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true, mode: 0o700 });

const manifestSteps = [];
for (let index = 0; index < steps.length; index += 1) {
  const [file, checks] = steps[index];
  const version = versionOf(file);
  const rawSource = readFileSync(resolve(migrationsDir, file), "utf8");
  const preservesSplitTransaction = file === splitTransactionMigration;
  const body = preservesSplitTransaction ? rawSource.trim() : migrationBody(rawSource, file);
  const requiredBefore = [...baselineVersions, ...steps.slice(0, index).map(([prior]) => versionOf(prior))];
  const forbidden = steps.slice(index).map(([later]) => versionOf(later));
  const artifact = `${String(index + 1).padStart(2, "0")}-${file}`;
  const precondition = `begin;\n\n-- PRECONDITION: exact prior history, empty preview data, no R2 schema.\ndo $$\ndeclare actual_history integer;\nbegin\n  if to_regclass('public.profiles') is null\n     or to_regclass('public.proposals') is null\n     or to_regclass('supabase_migrations.schema_migrations') is null then\n    raise exception 'Replay step ${index + 1} refused: baseline objects are absent';\n  end if;\n  if to_regclass('public.organizations') is not null then\n    raise exception 'Replay step ${index + 1} refused: R2 is already present';\n  end if;\n  if exists (select 1 from public.profiles) or exists (select 1 from public.proposals) then\n    raise exception 'Replay step ${index + 1} refused: preview application data is not empty';\n  end if;\n  select count(*) into actual_history from supabase_migrations.schema_migrations;\n  if actual_history <> ${requiredBefore.length} then\n    raise exception 'Replay step ${index + 1} refused: expected ${requiredBefore.length} total history rows, found %', actual_history;\n  end if;\n  if (select count(*) from supabase_migrations.schema_migrations where version = any(array[${sqlList(requiredBefore)}])) <> ${requiredBefore.length} then\n    raise exception 'Replay step ${index + 1} refused: required prior versions do not match';\n  end if;\n  if exists (select 1 from supabase_migrations.schema_migrations where version = any(array[${sqlList(forbidden)}])) then\n    raise exception 'Replay step ${index + 1} refused: current or later replay version already exists';\n  end if;\nend $$;`;
  const bodyMarker = preservesSplitTransaction
    ? "-- EXACT RAW MIGRATION SOURCE (internal transaction split preserved)."
    : "-- EXACT MIGRATION BODY (outer transaction wrapper removed only).";
  const transactionBridge = preservesSplitTransaction ? "\ncommit;\n" : "";
  // The raw split-transaction migration releases its lock before validating.
  // Repeat every safety precondition in the final history transaction so even
  // a continue-on-error client cannot record history after a refusal.
  const finalTransactionGuard = preservesSplitTransaction ? `${precondition}\n\n` : "";
  const sql = `-- GENERATED FILE: do not edit or commit.\n-- Step ${index + 1}/${steps.length}: ${file}\n-- Isolated preview ynzkwctwlssjcsjmahey only; production is not authorized.\n-- Source SHA-256: ${sha256(rawSource)}\n\n${precondition}${transactionBridge}\n${bodyMarker}\n${body}\n\n${finalTransactionGuard}-- POSTCONDITION: prove this migration's observable outcome before history.\ndo $$\nbegin\n  if not (${checks.join(") or not (")}) then\n    raise exception 'Replay step ${index + 1} postcondition failed for ${file}';\n  end if;\n  if exists (select 1 from supabase_migrations.schema_migrations where version='${version}') then\n    raise exception 'Replay step ${index + 1} postcondition failed: history appeared before verification';\n  end if;\nend $$;\n\n-- HISTORY IS RECORDED ONLY AFTER THE POSTCONDITION SUCCEEDS.\ninsert into supabase_migrations.schema_migrations (version, statements, name)\nvalues ('${version}', array[]::text[], '${nameOf(file)}');\n\ncommit;\n\nselect '${version}'::text as applied_version, '${sha256(rawSource)}'::text as source_sha256;\n`;
  writeFileSync(resolve(outputDir, artifact), sql, { encoding: "utf8", mode: 0o600 });
  manifestSteps.push({ order: index + 1, file, version, artifact, sourceSha256: sha256(rawSource), preservesSplitTransaction, requiredBefore, postconditions: checks });
}

const manifest = {
  status: "PREPARED / NOT HOSTED-EXECUTED",
  target: "isolated preview ynzkwctwlssjcsjmahey",
  productionAuthorized: false,
  baselineVersions,
  canonical034: "034_free_trial_no_credit_card.sql",
  executionRule: "Execute exactly one artifact at a time, in manifest order; stop on any error.",
  steps: manifestSteps,
};
writeFileSync(resolve(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify({ outputDir, stepCount: steps.length, status: manifest.status }, null, 2));
