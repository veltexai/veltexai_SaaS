import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/features/auth/services/get-user";
import { createServiceClient } from "@/lib/supabase/server";

const schema = z.object({
  buyerRole: z.enum(["owner_operator", "manager_estimator", "employee", "consultant", "other"]),
  businessType: z.enum(["commercial", "residential", "both", "specialty", "not_cleaning_business"]),
  bidsPerMonth: z.enum(["0", "1_3", "4_10", "10_plus"]),
});

export async function GET() {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = createServiceClient() as any;
  const { data, error } = await db.from("profiles").select("buyer_role, cleaning_business_type, bids_per_month_bucket").eq("id", user.id).single();
  if (error) return NextResponse.json({ error: "Unable to load qualification" }, { status: 503 });
  return NextResponse.json({ complete: Boolean(data.buyer_role && data.cleaning_business_type && data.bids_per_month_bucket), buyerRole: data.buyer_role, businessType: data.cleaning_business_type, bidsPerMonth: data.bids_per_month_bucket });
}

export async function POST(request: NextRequest) {
  const { user } = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Choose one answer for each question" }, { status: 400 });
  const db = createServiceClient() as any;
  const { buyerRole, businessType, bidsPerMonth } = parsed.data;
  const isQualifiedOwner = ["owner_operator", "manager_estimator"].includes(buyerRole) && ["commercial", "both"].includes(businessType) && bidsPerMonth !== "0";
  const { error } = await db.from("profiles").update({ buyer_role: buyerRole, cleaning_business_type: businessType, bids_per_month_bucket: bidsPerMonth, qualified_at: new Date().toISOString() }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Unable to save qualification" }, { status: 503 });
  await db.from("marketing_funnel_events").upsert({ event_id: `role_qualified:${user.id}`, user_id: user.id, event_name: "role_qualified", properties: { buyer_role: buyerRole, business_type: businessType, bids_per_month_bucket: bidsPerMonth, is_qualified_owner: isQualifiedOwner } }, { onConflict: "event_id" });
  return NextResponse.json({ complete: true, isQualifiedOwner });
}
