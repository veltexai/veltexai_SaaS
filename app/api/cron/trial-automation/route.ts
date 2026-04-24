/**
 * Cron endpoint — runs once per day.
 *
 * Handles four automated lifecycle emails:
 *   1. proposal_reminder_24h — sent 24–72h after signup if the user has 0 proposals
 *   2. trial_ending          — "2-day notice": trial ends in 24–48 hours
 *   3. trial_ending_1d       — "final day notice": trial ends in 0–24 hours
 *   4. trial_expired         — sent once after trial_end_at has passed with no subscription
 *
 * Each email_type has its own row in `email_automation_log` with a UNIQUE
 * (user_id, email_type) constraint, so a user receives each notice at most once.
 *
 * Protect this route by setting CRON_SECRET in your environment and including it
 * in the scheduler request:  Authorization: Bearer <CRON_SECRET>
 *
 * Vercel Cron example (vercel.json):
 *   { "crons": [{ "path": "/api/cron/trial-automation", "schedule": "0 10 * * *" }] }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { EmailService } from "@/lib/email/service";
import config from "@/config/config";

const UPGRADE_URL = `${config.domainName}/dashboard/billing`;
const CREATE_PROPOSAL_URL = `${config.domainName}/dashboard/proposals/new`;

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_MIN_AGE_MS = 24 * 60 * 60 * 1000; // signed up ≥ 24h ago
const REMINDER_MAX_AGE_MS = 72 * 60 * 60 * 1000; // signed up ≤ 72h ago (safety window)

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const results = {
    proposal_reminder_24h: 0,
    trial_ending: 0,
    trial_ending_1d: 0,
    trial_expired: 0,
    errors: 0,
  };
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const in24hIso = new Date(now + ONE_DAY_MS).toISOString();
  const in48hIso = new Date(now + 2 * ONE_DAY_MS).toISOString();

  // ── 1. 24h-after-signup reminder (no proposal created) ──────────────────────
  // Target: users who signed up between 24h and 72h ago, still on free_trial,
  // and have not created a proposal yet. The 72h upper bound + dedup via
  // email_automation_log gives us safety if the cron skips a day.
  const reminderFrom = new Date(now - REMINDER_MAX_AGE_MS).toISOString();
  const reminderTo = new Date(now - REMINDER_MIN_AGE_MS).toISOString();

  const { data: reminderCandidates, error: reminderError } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at")
    .eq("subscription_status", "free_trial")
    .gte("created_at", reminderFrom)
    .lte("created_at", reminderTo);

  if (reminderError) {
    console.error(
      "❌ Cron: error querying proposal_reminder_24h candidates:",
      reminderError,
    );
  } else if (reminderCandidates) {
    for (const profile of reminderCandidates) {
      try {
        if (!profile.email) continue;

        // Skip users who already have ≥ 1 proposal.
        const { count: proposalCount, error: countError } = await supabase
          .from("proposals")
          .select("id", { count: "exact", head: true })
          .eq("user_id", profile.id);

        if (countError) {
          console.error(
            `❌ Cron: error counting proposals for ${profile.id}:`,
            countError,
          );
          results.errors++;
          continue;
        }

        if ((proposalCount ?? 0) > 0) continue;

        // Skip if the reminder has already been logged.
        const { data: alreadySent } = await supabase
          .from("email_automation_log")
          .select("id")
          .eq("user_id", profile.id)
          .eq("email_type", "proposal_reminder_24h")
          .maybeSingle();

        if (alreadySent) continue;

        const sent = await EmailService.sendProposalReminderEmail(
          profile.email,
          {
            userName:
              (profile.full_name || "").split(" ")[0]?.trim() || "there",
            createProposalUrl: CREATE_PROPOSAL_URL,
          },
        );

        if (sent) {
          await supabase.from("email_automation_log").insert({
            user_id: profile.id,
            email_type: "proposal_reminder_24h",
          });
          results.proposal_reminder_24h++;
        }
      } catch (err) {
        console.error(
          `❌ Cron: proposal_reminder_24h email failed for ${profile.id}:`,
          err,
        );
        results.errors++;
      }
    }
  }

  // ── 2. Trial ending — 2-day notice ──────────────────────────────────────────
  // Target: free_trial users whose trial ends in 24–48 hours from now.
  const { data: endingSoon, error: endingError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("subscription_status", "free_trial")
    .gt("trial_end_at", in24hIso)
    .lte("trial_end_at", in48hIso);

  if (endingError) {
    console.error("❌ Cron: error querying ending-soon users:", endingError);
  } else if (endingSoon) {
    for (const profile of endingSoon) {
      try {
        if (!profile.email) continue;

        const { data: alreadySent } = await supabase
          .from("email_automation_log")
          .select("id")
          .eq("user_id", profile.id)
          .eq("email_type", "trial_ending")
          .maybeSingle();

        if (alreadySent) continue;

        const sent = await EmailService.sendTrialEndingReminderEmail(
          profile.email,
          { upgradeUrl: UPGRADE_URL },
        );

        if (sent) {
          await supabase.from("email_automation_log").insert({
            user_id: profile.id,
            email_type: "trial_ending",
          });
          results.trial_ending++;
        }
      } catch (err) {
        console.error(
          `❌ Cron: trial_ending email failed for ${profile.id}:`,
          err,
        );
        results.errors++;
      }
    }
  }

  // ── 3. Trial ending — final day notice ──────────────────────────────────────
  // Target: free_trial users whose trial ends within the next 24 hours.
  // Fires independently from `trial_ending` via its own email_type so each
  // user gets the 2-day notice AND the 1-day notice (at most once each).
  const { data: endingToday, error: endingTodayError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("subscription_status", "free_trial")
    .gt("trial_end_at", nowIso)
    .lte("trial_end_at", in24hIso);

  if (endingTodayError) {
    console.error(
      "❌ Cron: error querying final-day users:",
      endingTodayError,
    );
  } else if (endingToday) {
    for (const profile of endingToday) {
      try {
        if (!profile.email) continue;

        const { data: alreadySent } = await supabase
          .from("email_automation_log")
          .select("id")
          .eq("user_id", profile.id)
          .eq("email_type", "trial_ending_1d")
          .maybeSingle();

        if (alreadySent) continue;

        const sent = await EmailService.sendTrialEndingFinalDayEmail(
          profile.email,
          { upgradeUrl: UPGRADE_URL },
        );

        if (sent) {
          await supabase.from("email_automation_log").insert({
            user_id: profile.id,
            email_type: "trial_ending_1d",
          });
          results.trial_ending_1d++;
        }
      } catch (err) {
        console.error(
          `❌ Cron: trial_ending_1d email failed for ${profile.id}:`,
          err,
        );
        results.errors++;
      }
    }
  }

  // ── 4. Trial expired follow-up ──────────────────────────────────────────────
  // Target: free_trial users whose trial_end_at is in the past (expired).
  const { data: expired, error: expiredError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("subscription_status", "free_trial")
    .lt("trial_end_at", new Date().toISOString());

  if (expiredError) {
    console.error("❌ Cron: error querying expired users:", expiredError);
  } else if (expired) {
    for (const profile of expired) {
      try {
        const { data: alreadySent } = await supabase
          .from("email_automation_log")
          .select("id")
          .eq("user_id", profile.id)
          .eq("email_type", "trial_expired")
          .maybeSingle();

        if (alreadySent) continue;

        const sent = await EmailService.sendTrialExpiredEmail(profile.email, {
          upgradeUrl: UPGRADE_URL,
        });

        if (sent) {
          await supabase.from("email_automation_log").insert({
            user_id: profile.id,
            email_type: "trial_expired",
          });
          results.trial_expired++;
        }
      } catch (err) {
        console.error(
          `❌ Cron: trial_expired email failed for ${profile.id}:`,
          err,
        );
        results.errors++;
      }
    }
  }

  console.log("✅ Cron trial-automation complete:", results);
  return NextResponse.json({ ok: true, results });
}
