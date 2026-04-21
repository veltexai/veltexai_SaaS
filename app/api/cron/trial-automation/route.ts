/**
 * Cron endpoint — runs once per day.
 *
 * Handles three automated lifecycle emails:
 *   1. proposal_reminder_24h — sent 24–72h after signup if the user has 0 proposals
 *   2. trial_ending           — sent when a free-trial user has ≤ 2 days left
 *   3. trial_expired          — sent once after trial_end_at has passed with no subscription
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
    trial_expired: 0,
    errors: 0,
  };
  const now = Date.now();

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

  // ── 2. Trial ending reminder ────────────────────────────────────────────────
  // Target: free_trial users whose trial ends within the next 2 days.
  const { data: endingSoon, error: endingError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("subscription_status", "free_trial")
    .gt("trial_end_at", new Date().toISOString())
    .lt("trial_end_at", new Date(now + 2 * ONE_DAY_MS).toISOString());

  if (endingError) {
    console.error("❌ Cron: error querying ending-soon users:", endingError);
  } else if (endingSoon) {
    for (const profile of endingSoon) {
      try {
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

  // ── 3. Trial expired follow-up ──────────────────────────────────────────────
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
