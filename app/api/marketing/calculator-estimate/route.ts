import { createHash, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { EmailService } from "@/lib/email/service";
import { FIRST_TOUCH_COOKIE, parseAttribution } from "@/lib/analytics/attribution";
export const runtime = "nodejs";

const schema = z.object({ email: z.string().email().max(255), consent: z.literal(true), company: z.string().max(0).optional(), estimate: z.object({ monthlyVisits: z.number().finite().nonnegative().max(10000), monthlyHours: z.number().finite().nonnegative().max(100000), labor: z.number().finite().nonnegative().max(100000000), totalCost: z.number().finite().nonnegative().max(100000000), price: z.number().finite().nonnegative().max(100000000), perVisit: z.number().finite().nonnegative().max(100000000) }) });
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export async function POST(request: NextRequest) {
  if (process.env.CALCULATOR_EMAIL_CAPTURE_ENABLED !== "true") return NextResponse.json({ error: "Feature unavailable" }, { status: 404 });
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.company) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ipHash = createHash("sha256").update(`${process.env.ATTRIBUTION_HASH_SALT ?? "veltex"}:${ip}`).digest("hex");
  const supabase = await createServiceClient();
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase.from("calculator_estimate_requests").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= 3) return NextResponse.json({ error: "Request limit reached. Try again later." }, { status: 429 });
  const attribution = parseAttribution(request.cookies.get(FIRST_TOUCH_COOKIE)?.value);
  const requestId = randomUUID();
  const { error: insertError } = await supabase.from("calculator_estimate_requests").insert({ id: requestId, email: parsed.data.email.toLowerCase(), ip_hash: ipHash, transactional_consent_at: new Date().toISOString(), attribution, estimate: parsed.data.estimate, delivery_status: "pending" });
  if (insertError) return NextResponse.json({ error: "Unable to prepare estimate" }, { status: 500 });
  const doc = new jsPDF();
  doc.setFontSize(20); doc.text("Veltex AI Cleaning Bid Estimate", 20, 25);
  doc.setFontSize(11); doc.text("Planning estimate — validate all inputs before quoting a customer.", 20, 35);
  const lines = [["Monthly visits", parsed.data.estimate.monthlyVisits.toFixed(1)], ["Monthly labor hours", parsed.data.estimate.monthlyHours.toFixed(1)], ["Burdened labor", money(parsed.data.estimate.labor)], ["Estimated monthly cost", money(parsed.data.estimate.totalCost)], ["Recommended monthly price", money(parsed.data.estimate.price)], ["Approximate price per visit", money(parsed.data.estimate.perVisit)]];
  lines.forEach(([label, value], index) => doc.text(`${label}: ${value}`, 20, 55 + index * 10));
  doc.setFontSize(9); doc.text("This estimate does not account for taxes, local rules, unusual scope conditions, or every business cost.", 20, 125, { maxWidth: 170 });
  const sent = await EmailService.sendCalculatorEstimateEmail({ userEmail: parsed.data.email, estimatePdf: Buffer.from(doc.output("arraybuffer")) });
  await supabase.from("calculator_estimate_requests").update({ delivery_status: sent ? "sent" : "failed", delivered_at: sent ? new Date().toISOString() : null }).eq("id", requestId);
  if (!sent) return NextResponse.json({ error: "Unable to send estimate" }, { status: 503 });
  return NextResponse.json({ success: true });
}
