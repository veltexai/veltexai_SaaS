"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Answers = { buyerRole: string; businessType: string; bidsPerMonth: string };
const EMPTY: Answers = { buyerRole: "", businessType: "", bidsPerMonth: "" };

export function QualificationCard() {
  const [answers, setAnswers] = useState(EMPTY);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/onboarding/qualification").then(async (response) => response.ok ? response.json() : null).then((data) => {
      if (!active || !data || data.complete) return;
      setAnswers({ buyerRole: data.buyerRole ?? "", businessType: data.businessType ?? "", bidsPerMonth: data.bidsPerMonth ?? "" });
      setVisible(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  if (!visible) return null;
  const complete = Object.values(answers).every(Boolean);
  const save = async () => {
    if (!complete) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/onboarding/qualification", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(answers) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) setError(data.error || "We could not save your answers."); else setVisible(false);
    } catch { setError("We could not save your answers. You can continue for now."); }
    finally { setSaving(false); }
  };

  return <Card className="border-blue-200 bg-blue-50/60"><CardHeader className="pb-3">
    <CardTitle className="text-lg">Help us tailor your first proposal</CardTitle>
    <p className="text-sm text-gray-600">Three quick selections personalize the workflow. You can skip them and continue.</p>
  </CardHeader><CardContent className="space-y-4"><div className="grid gap-3 md:grid-cols-3">
    <Select value={answers.buyerRole} onValueChange={(buyerRole) => setAnswers((current) => ({ ...current, buyerRole }))}><SelectTrigger aria-label="Your role"><SelectValue placeholder="Your role" /></SelectTrigger><SelectContent><SelectItem value="owner_operator">Owner or operator</SelectItem><SelectItem value="manager_estimator">Manager or estimator</SelectItem><SelectItem value="employee">Employee</SelectItem><SelectItem value="consultant">Consultant</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select>
    <Select value={answers.businessType} onValueChange={(businessType) => setAnswers((current) => ({ ...current, businessType }))}><SelectTrigger aria-label="Cleaning business type"><SelectValue placeholder="Business type" /></SelectTrigger><SelectContent><SelectItem value="commercial">Commercial cleaning</SelectItem><SelectItem value="residential">Residential cleaning</SelectItem><SelectItem value="both">Commercial and residential</SelectItem><SelectItem value="specialty">Specialty cleaning</SelectItem><SelectItem value="not_cleaning_business">Not a cleaning business</SelectItem></SelectContent></Select>
    <Select value={answers.bidsPerMonth} onValueChange={(bidsPerMonth) => setAnswers((current) => ({ ...current, bidsPerMonth }))}><SelectTrigger aria-label="Bids per month"><SelectValue placeholder="Bids per month" /></SelectTrigger><SelectContent><SelectItem value="0">None yet</SelectItem><SelectItem value="1_3">1–3 bids</SelectItem><SelectItem value="4_10">4–10 bids</SelectItem><SelectItem value="10_plus">More than 10</SelectItem></SelectContent></Select>
  </div>{error && <p className="text-sm text-red-700">{error}</p>}<div className="flex flex-wrap gap-3"><Button type="button" onClick={save} disabled={!complete || saving}>{saving ? "Saving…" : "Personalize my proposal"}</Button><Button type="button" variant="ghost" onClick={() => setVisible(false)}>Skip for now</Button></div></CardContent></Card>;
}
