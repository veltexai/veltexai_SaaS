import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { PricingEngine } from "@/lib/pricing-engine";
import { getUser } from "@/lib/auth/auth-helpers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import {
  serviceTypeSchema,
  serviceFrequencySchema,
} from "@/lib/validations/proposal";
import { AITone } from "@/types/database";
import { formatCurrencySafe } from "@/lib/utils";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch complete profile data
    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      client_name,
      client_company,
      contact_phone,
      service_location,
      regional_location,
      city,
      title,
      service_type,
      service_frequency,
      facility_size,
      service_specific_data,
      pricing_data,
      pricing_enabled = false,
      // Enhanced facility data
      facility_details,
      traffic_analysis,
      service_scope,
      special_requirements,
      // AI enhancement fields
      ai_tone = "professional",
      is_regenerate = false,
      // Template data
      template_id,
    } = body;

    // Validate required fields
    if (!service_type || !client_name) {
      return NextResponse.json(
        { error: "Missing required fields: service_type, client_name" },
        { status: 400 },
      );
    }

    // Fetch template data if template_id is provided
    let templateData = null;
    if (template_id) {
      const { data: template, error: templateError } = await supabase
        .from("proposal_templates")
        .select("*")
        .eq("id", template_id)
        .eq("is_active", true)
        .single();

      if (!templateError && template) {
        templateData = template;
      }
    }

    // Create globalInputs object for the prompt
    const globalInputs = {
      clientName: client_name,
      clientCompany: client_company,
      clientEmail: "", // Not sent from frontend
      clientPhone: contact_phone,
      serviceLocation: service_location,
      facilitySize: facility_size,
      serviceFrequency: service_frequency,
      city: city,
      regionalLocation: regional_location,
    };

    // Get service type label
    const getServiceTypeLabel = (type: string) => {
      const labels = {
        residential: "Residential Cleaning",
        commercial: "Commercial Cleaning",
        carpet: "Carpet Cleaning",
        window: "Window Cleaning",
        floor: "Floor Care",
      };
      return labels[type as keyof typeof labels] || type;
    };

    // Visits per month approximation
    const getVisitsPerMonth = (freq: string): number => {
      const map: Record<string, number> = {
        "one-time": 1,
        "1x-month": 1,
        "bi-weekly": 2.17,
        weekly: 4.33,
        "2x-week": 8.66,
        "3x-week": 13.0,
        "5x-week": 21.67,
        daily: 30,
      };
      return map[freq] ?? 1;
    };

    // Frequency discount (maps extra weekly variants to weekly base)
    const getFrequencyDiscount = (freq: string, settings: any): number => {
      const baseKeyMap: Record<string, string> = {
        "one-time": "one-time",
        "1x-month": "monthly",
        "bi-weekly": "bi-weekly",
        weekly: "weekly",
        "2x-week": "weekly",
        "3x-week": "weekly",
        "5x-week": "weekly",
        daily: "weekly",
      };
      const base = baseKeyMap[freq] || "one-time";
      const multipliers: Record<string, number> =
        (settings?.frequency_multipliers as Record<string, number>) || {
          "one-time": 1.0,
          weekly: 0.9,
          "bi-weekly": 0.95,
          monthly: 1.0,
        };
      return multipliers[base] ?? 1.0;
    };

    const formatMoney = (n: number) => `$${(n ?? 0).toFixed(2)}`;

    // Get service frequency label
    const getServiceFrequencyLabel = (freq: string) => {
      const labels: Record<string, string> = {
        "one-time": "One-time",
        "1x-month": "Monthly",
        "bi-weekly": "Bi-weekly",
        weekly: "Weekly",
        "2x-week": "2x weekly",
        "3x-week": "3x weekly",
        "5x-week": "5x weekly",
        daily: "Daily",
      };
      return labels[freq] || freq;
    };

    // Get tone instructions
    const getToneInstructions = (tone: AITone) => {
      const toneInstructions = {
        professional:
          "Use a professional, business-focused tone. Be formal but approachable, emphasizing expertise and reliability.",
        friendly:
          "Use a warm, friendly tone that builds rapport. Be personable while maintaining professionalism.",
        formal:
          "Use a very formal, structured tone. Be precise, detailed, and follow traditional business communication standards.",
        casual:
          "Use a relaxed, conversational tone. Be approachable and easy to understand while remaining professional.",
        technical:
          "Use a detail-oriented, technical tone. Include specific methodologies, processes, and technical expertise.",
      };
      return toneInstructions[tone] || toneInstructions.professional;
    };

    // Helper function to format enhanced facility data
    const formatEnhancedData = () => {
      let enhancedInfo = "";

      // Facility Details
      if (facility_details && Object.keys(facility_details).length > 0) {
        enhancedInfo += "\n--- FACILITY DETAILS ---\n";
        if (facility_details.building_age) {
          enhancedInfo += `Building Age: ${facility_details.building_age} years\n`;
        }
        if (facility_details.building_type) {
          enhancedInfo += `Building Type: ${facility_details.building_type}\n`;
        }
        if (facility_details.accessibility_requirements?.length > 0) {
          enhancedInfo += `Accessibility Requirements: ${facility_details.accessibility_requirements.join(
            ", ",
          )}\n`;
        }
        if (facility_details.special_areas?.length > 0) {
          enhancedInfo += `Special Areas: ${facility_details.special_areas.join(
            ", ",
          )}\n`;
        }
        if (facility_details.equipment_present?.length > 0) {
          enhancedInfo += `Equipment Present: ${facility_details.equipment_present.join(
            ", ",
          )}\n`;
        }
        if (facility_details.environmental_concerns?.length > 0) {
          enhancedInfo += `Environmental Concerns: ${facility_details.environmental_concerns.join(
            ", ",
          )}\n`;
        }
      }

      // Traffic Analysis
      if (traffic_analysis && Object.keys(traffic_analysis).length > 0) {
        enhancedInfo += "\n--- TRAFFIC ANALYSIS ---\n";
        if (traffic_analysis.staff_count) {
          enhancedInfo += `Staff Count: ${traffic_analysis.staff_count}\n`;
        }
        if (traffic_analysis.visitor_frequency) {
          enhancedInfo += `Visitor Frequency: ${traffic_analysis.visitor_frequency}\n`;
        }
        if (traffic_analysis.traffic_level) {
          enhancedInfo += `Traffic Level: ${traffic_analysis.traffic_level}\n`;
        }
        if (traffic_analysis.peak_hours?.length > 0) {
          enhancedInfo += `Peak Hours: ${traffic_analysis.peak_hours.join(
            ", ",
          )}\n`;
        }
        if (traffic_analysis.special_events) {
          enhancedInfo += `Special Events: Yes\n`;
        }
      }

      // Service Scope
      if (service_scope && Object.keys(service_scope).length > 0) {
        enhancedInfo += "\n--- SERVICE SCOPE ---\n";
        if (service_scope.areas_included?.length > 0) {
          enhancedInfo += `Areas Included: ${service_scope.areas_included.join(
            ", ",
          )}\n`;
        }
        if (service_scope.areas_excluded?.length > 0) {
          enhancedInfo += `Areas Excluded: ${service_scope.areas_excluded.join(
            ", ",
          )}\n`;
        }
        if (service_scope.special_services?.length > 0) {
          enhancedInfo += `Special Services: ${service_scope.special_services.join(
            ", ",
          )}\n`;
        }
      }

      // Special Requirements
      if (
        special_requirements &&
        Object.keys(special_requirements).length > 0
      ) {
        enhancedInfo += "\n--- SPECIAL REQUIREMENTS ---\n";
        if (special_requirements.security_clearance) {
          enhancedInfo += `Security Clearance: Required\n`;
        }
        if (special_requirements.after_hours_access) {
          enhancedInfo += `After Hours Access: Required\n`;
        }
        if (special_requirements.special_equipment?.length > 0) {
          enhancedInfo += `Special Equipment: ${special_requirements.special_equipment.join(
            ", ",
          )}\n`;
        }
        if (special_requirements.certifications_required?.length > 0) {
          enhancedInfo += `Certifications Required: ${special_requirements.certifications_required.join(
            ", ",
          )}\n`;
        }
        if (special_requirements.insurance_requirements?.length > 0) {
          enhancedInfo += `Insurance Requirements: ${special_requirements.insurance_requirements.join(
            ", ",
          )}\n`;
        }
      }

      return enhancedInfo;
    };

    // Extract template config (handle both template_config and template_data)
    const templateConfig: any = templateData
      ? templateData.template_config || templateData.template_data || {}
      : {};

    // Detect Basic Professional template style
    const isBasicProfessional = (() => {
      const name = (
        templateData?.name ||
        templateData?.display_name ||
        ""
      ).toLowerCase();
      const style = (templateConfig?.style || "").toLowerCase();
      return (
        name.includes("basic") ||
        style === "basic_professional" ||
        (templateConfig?.layout === "five_page" &&
          Array.isArray(templateConfig?.sections))
      );
    })();

    // Semi-static Legal responsibility guidance
    const legalResponsibilityGuidance = `
Use the following legal responsibility points verbatim or with light copy edits (do not change meaning):
A. Contractor agrees to maintain required liability and accidental insurance and bonding.
B. Contractor agrees to hold harmless customer from claims for injury, death or property damage due to negligence or accident on part of the contractor, its employees or agents.
C. Contractor agrees to employ safe and professionally accepted cleaning procedures.
D. Customer agrees not to hire any worker or person employed by the contractor during the term of this agreement and for ninety days after the expiration of this agreement.
E. Contractor is an Independent Contractor with control over its procedures, employees and agents.
`;

    // Quick pricing estimate for scope table (safe fallback when no proposal exists)
    let tableCostPerVisit = "—";
    let tableMonthlyCost = "—";

    try {
      // Priority 1: Use saved pricing_data if available (from Pricing Calculation UI)
      if (pricing_data && pricing_data.price_range) {
        // Calculate total from the midpoint of the price range (same as UI logic)
        const low = pricing_data.price_range.low;
        const high = pricing_data.price_range.high;

        let calculatedTotal = 0;
        if (typeof low === "number" && typeof high === "number") {
          calculatedTotal = (low + high) / 2; // Midpoint
        } else if (typeof low === "number") {
          calculatedTotal = low;
        } else if (typeof high === "number") {
          calculatedTotal = high;
        }

        if (calculatedTotal > 0) {
          tableMonthlyCost = formatMoney(calculatedTotal);
          // Calculate per-visit by dividing by visits per month
          const visits = getVisitsPerMonth(service_frequency);
          if (visits > 0) {
            tableCostPerVisit = formatMoney(calculatedTotal / visits);
          }
        }
      } else if (
        pricing_data &&
        typeof pricing_data.total === "number" &&
        pricing_data.total > 0
      ) {
        // Fallback: if pricing_data has a direct total field
        tableMonthlyCost = formatMoney(pricing_data.total);
        const visits = getVisitsPerMonth(service_frequency);
        if (visits > 0) {
          tableCostPerVisit = formatMoney(pricing_data.total / visits);
        }
      } else {
        // Priority 2: Calculate fresh using PricingEngine (fallback)
        const { data: settingsRows } = await supabase
          .from("pricing_settings")
          .select("*")
          .eq("is_active", true)
          .order("is_default", { ascending: false })
          .limit(1);
        const settings: any = Array.isArray(settingsRows)
          ? settingsRows[0]
          : settingsRows;

        const engine = new PricingEngine(settings || null);
        const perVisitResult = engine.calculatePricing({
          serviceType: service_type,
          facilitySize: Number(facility_size) || 0,
          serviceFrequency: "one-time",
          serviceSpecificData: service_specific_data || {},
          globalInputs,
          pricingSettings: settings || undefined,
        });
        const perVisitTotal = perVisitResult.total || 0;
        const visits = getVisitsPerMonth(service_frequency);
        const discount = getFrequencyDiscount(
          service_frequency,
          engine.getSettings(),
        );

        if (perVisitTotal > 0 && visits > 0) {
          tableCostPerVisit = formatMoney(perVisitTotal);
          tableMonthlyCost = formatMoney(perVisitTotal * visits * discount);
        }
      }
    } catch (error) {
      console.error("❌ Error calculating pricing for scope table:", error);
      // keep placeholders '—' on error
    }

    // Deterministic fenced JSON blocks to embed in-place within structure
    const scopeTableData = {
      rows: [
        {
          area: service_scope?.areas_included?.join(", ") || "—",
          frequency: getServiceFrequencyLabel(service_frequency),
          costPerVisit: tableCostPerVisit || null,
          monthlyCost: tableMonthlyCost || null,
        },
      ],
    };
    const scopeTableFenced = `\n\`\`\`veliz_scope_table\n${JSON.stringify(
      scopeTableData,
    )}\n\`\`\`\n`;

    const additionalServicesRows = Array.isArray(
      service_scope?.special_services,
    )
      ? (service_scope.special_services as string[]).map((s: string) => ({
          service: s,
          pricePerTime: null,
          pricePerMonth: null,
        }))
      : [];
    const additionalServicesFenced =
      additionalServicesRows.length > 0
        ? `\n\`\`\`veliz_additional_services\n${JSON.stringify({
            rows: additionalServicesRows,
          })}\n\`\`\`\n`
        : "";

    const extractYears = (text?: string | null): number | null => {
      const t = (text || "").toLowerCase();
      const m = t.match(
        /(?:over\s+)?(\d{1,3})\s+years?\s+(?:of\s+)?(?:experience|in\s+business)/i,
      );
      if (m) {
        const n = Number(m[1]);
        if (!Number.isNaN(n) && n > 0) return n;
      }
      return null;
    };

    const premiumScopeRows = Array.isArray(service_scope?.areas_included)
      ? (service_scope!.areas_included as string[]).map((area: string) => ({
          area,
          frequency: getServiceFrequencyLabel(service_frequency),
          note:
            typeof service_scope?.special_notes === "string"
              ? service_scope!.special_notes
              : null,
        }))
      : scopeTableData.rows.map((r) => ({
          area: r.area,
          frequency: r.frequency,
          note:
            typeof service_scope?.special_notes === "string"
              ? service_scope!.special_notes
              : null,
        }));
    const scopeTablePremiumFenced = `\n\`\`\`veliz_scope_table\n${JSON.stringify(
      { rows: premiumScopeRows },
    )}\n\`\`\`\n`;

    const selectedAddons: any[] = Array.isArray(body.selected_addons)
      ? body.selected_addons
      : [];
    const addonTitlesMarkdown =
      selectedAddons.length > 0
        ? selectedAddons.map((a) => `- ${a.label}`).join("\n") + "\n"
        : "";

    const toMoney = (n: number) => `$${(n || 0).toFixed(2)}`;
    const baseMonthlyNum = (() => {
      const s = String(tableMonthlyCost);
      const n = Number(s.replace(/[^0-9.]/g, ""));
      return Number.isFinite(n) ? n : 0;
    })();
    const pricingRows = [
      {
        service: "Standard Janitorial Service",
        frequency: getServiceFrequencyLabel(service_frequency),
        pricePerMonth: toMoney(baseMonthlyNum),
      },
      ...selectedAddons.map((a) => {
        // Calculate subtotal: use provided subtotal or compute from qty * rate
        const subtotal =
          typeof a.subtotal === "number" && a.subtotal > 0
            ? a.subtotal
            : (Number(a.qty) || 0) * (Number(a.rate) || 0);

        // Determine monthly amount based on frequency
        const freq = String(a.frequency || "").toLowerCase();
        let monthlyAmount = 0;

        if (typeof a.monthly_amount === "number" && a.monthly_amount > 0) {
          // Use provided monthly_amount if available
          monthlyAmount = a.monthly_amount;
        } else if (freq === "monthly") {
          monthlyAmount = subtotal;
        } else if (freq === "quarterly") {
          monthlyAmount = subtotal / 3;
        } else if (freq === "annual") {
          monthlyAmount = subtotal / 12;
        } else if (freq === "one_time") {
          // One-time services don't have a monthly equivalent
          monthlyAmount = subtotal / 12;
        }

        return {
          service: a.label,
          frequency: a.frequency || a.frequency_label || "As selected",
          pricePerMonth: toMoney(monthlyAmount),
        };
      }),
    ];
    const subtotalNum = pricingRows.reduce((sum, r) => {
      const v = Number(String(r.pricePerMonth).replace(/[^0-9.]/g, ""));
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
    const taxRate = 0;
    const taxNum = subtotalNum * taxRate;
    const totalNum = subtotalNum + taxNum;
    const pricingTableData = {
      rows: pricingRows,
      summary: {
        subtotal: toMoney(subtotalNum),
        tax: toMoney(taxNum),
        total: toMoney(totalNum),
      },
    };
    const pricingTableFenced = `\n\`\`\`veliz_pricing_table\n${JSON.stringify(pricingTableData)}\n\`\`\`\n`;

    // Conditionally build pricing sections based on pricing_enabled flag
    const basicProfessionalPricingSection = pricing_enabled
      ? `
## Pricing
A. Customer agrees to pay contractor ${formatCurrencySafe(
          tableMonthlyCost,
        )} monthly cost.

## Additional services to be invoiced (Optional)
${additionalServicesFenced}

B. Accounts are considered delinquent after net 30 days. Can add late charge of $30.00 per day collection fees (payable by customer)

C. A new price may be negotiated if customer requests a change in frequency or coverage.

D. If customer schedules service and cancels a $75.00 fee will be charged.

E. If unforeseen events occur beyond the contractor's control (strikes, construction obstacles, calamities, major tax increases or national economic crisis) a new price may be negotiated.
`
      : "";

    // Build structure instructions for Basic Professional (uses conditional pricing section)
    const basicProfessionalStructure = `
Return markdown with ONLY these top-level sections using exact headings:${!pricing_enabled ? "\nIMPORTANT: Do NOT include any Pricing or Additional services sections - the client has disabled pricing for this proposal." : ""}
Include the fenced JSON blocks exactly as shown; do not alter their content or formatting.
## Cover letter
HARD RULES FOR THIS SECTION:
- Do NOT include salutations like "Dear", "Hello" or "Hi" anywhere.
- Start directly with the message.
- Do NOT begin with client or company names, roles, or headings. The first line MUST be a sentence (no name line) starting with "We", "Our", or "As a service provider" — no commas or colons after a name.
- Use markdown bold (**) to emphasize important words and short phrases.

STRUCTURE:
- Paragraph 1: 3–4 short sentences, warm and tailored to the client and service type. Include 2–3 bold phrases using markdown (** … **), e.g., **quality control**, **attention to detail**, **reliable scheduling**.
- Paragraph 2: 2–3 short sentences that reinforce a clear value proposition and our **pledge of excellence**. Include at least one bold phrase.
- Paragraph 3: exactly one sentence: "Our pledge to you as a valued customer includes:" (verbatim).

 - Then include EXACTLY six bullet points. Each bullet MUST begin with the bold label below (for icon mapping) followed by Text of min three lines (max 5) in our layout, customized to the client:
  - **100% satisfaction** – commitment to service quality and responsive support.
  - **Guaranteed professionalism and reliability** – trained staff, insured, punctual, consistent results.
  - **Attention to detail** – thorough processes and quality checks.
  - **Total Service** – comprehensive scope aligned to your facility needs.
  - **Prompt follow up** – quick response to requests or issues.
  - **Should a problem ever exist, you can be assured it will be promptly handled** – clear escalation and corrective procedures.

- End the Cover letter section with the following closing lines on their own:
  
  Thank you again for the opportunity to submit this proposal.  We hope we can work together as a team in the future.
  Sincerely, ${profile.company_name || "Your Company"}

## Scope of service
A. Contractor will furnish all labor, supervision and equipment (except customer used supplies such as paper towels, tissue, hand soap and trash liners) to clean the listed areas.

${scopeTableFenced}

B. Pricing shall remain in effect one year from the starting date with contract renewable annually.

C. Customer agrees to notify contractor of any complaints and allow time for prompt correction.

D. Either party may terminate this agreement with 30 days notice.

## Legal responsibility
${legalResponsibilityGuidance}
${basicProfessionalPricingSection}`;

    const aboutIntro =
      profile.company_background && profile.company_background.trim().length > 0
        ? `Summarize in 2–3 sentences based on: "${
            profile.company_background
          }". Highlight **reliable scheduling** and **quality assurance** aligned with ${
            globalInputs.serviceLocation || "your area"
          }.`
        : `${
            profile.company_name || "Our company"
          } delivers professional commercial cleaning solutions tailored to facilities of all sizes in ${
            globalInputs.serviceLocation || "your area"
          }. Our approach blends trained teams, **reliable scheduling**, and **quality assurance** aligned with your operating hours and compliance standards.`;
    const yearsLabel = (() => {
      const y = extractYears(profile.company_background);
      return y ? `${y} years in business` : "10 years in business";
    })();

    // Conditionally build pricing section for Executive Premium template
    const executivePremiumPricingSection = pricing_enabled
      ? `
## Service Quote & Pricing
${pricingTableFenced}

Notes:
- Adjustments require written approval.
- Quote valid for 30 days. Pricing reflects scope and frequency above.
- Add-on services are prorated based on selected frequency and distributed into equal monthly installments.
`
      : "";

    const executivePremiumStructure = `
Return markdown with ONLY these top-level sections using exact headings:${!pricing_enabled ? '\nIMPORTANT: Do NOT include any "Service Quote & Pricing" section - the client has disabled pricing for this proposal.' : ""}
Include the fenced JSON blocks exactly as shown; do not alter their content or formatting.

## About Our Company
We specialize in supporting education, retail, office, and healthcare facilities with structured service programs designed for operational consistency. Our approach blends trained teams, **reliable scheduling**, and **quality assurance** aligned with your operating hours and compliance standards.

- 10 years in business
- ${`${city}, ${globalInputs.regionalLocation}` || "Service Location To Be Confirmed"}
- Education, offices, retail & healthcare
- 100% Satisfaction

## Our Commitment
We are committed to delivering **consistent quality**, **responsive communication**, and a **safe**, **healthy environment**. Every service plan includes supervision, documented inspections, and continuous improvement measures to ensure your facility looks its best.

- At **${profile.company_name || "Our Company"}**, we are committed to delivering consistent, measurable service quality through structured supervision, documented inspections, and continuous performance improvement.
- Our teams follow clearly defined Standard Operating Procedures (SOPs) and safety protocols to ensure reliability across every visit.
- We maintain responsive communication with designated client contacts, providing prompt resolution of service requests, quality concerns, or operational changes.
- Through proactive oversight, secure access management, and compliance-driven practices, we create and maintain safe, healthy, and professional environments that support your organization’s daily operations.

## Why Choose Us
- Professional Teams: same meaning, similar length; use fresh wording.
- Transparent Pricing: same meaning, similar length; use fresh wording.
- Quality Assurance: same meaning, similar length; use fresh wording.
- Eco‑Conscious: same meaning, similar length; use fresh wording.
- Reliability: same meaning, similar length; use fresh wording.

## Scope of service
Below is a representative scope from scope & frequency logic. Adjust tasks and frequencies per site. This table should expand/collapse cleanly based on selected areas and add-ons.
${scopeTablePremiumFenced}

Add-ons
${addonTitlesMarkdown}
${executivePremiumPricingSection}`;

    const modernCorporateStructure = executivePremiumStructure;
    const luxuryEliteStructure = executivePremiumStructure;

    const detectTemplateType = ():
      | "basic"
      | "executive_premium"
      | "modern_corporate"
      | "luxury_elite"
      | "other" => {
      const n = (
        templateData?.name ||
        templateData?.display_name ||
        ""
      ).toLowerCase();
      const t = (templateData?.template_type || "").toLowerCase();
      const s = (templateConfig?.style || "").toLowerCase();
      if (
        n.includes("luxury") ||
        n.includes("elite") ||
        s.includes("luxury") ||
        t === "luxury_elite"
      )
        return "luxury_elite";
      if (
        n.includes("executive") ||
        n.includes("premium") ||
        s.includes("executive") ||
        s.includes("premium") ||
        t === "executive_premium"
      )
        return "executive_premium";
      if (
        n.includes("modern") ||
        n.includes("corporate") ||
        s.includes("modern") ||
        s.includes("corporate") ||
        t === "modern_corporate"
      )
        return "modern_corporate";
      if (isBasicProfessional) return "basic";
      return "other";
    };

    const templateType = detectTemplateType();
    const selectedStructure =
      templateType === "luxury_elite"
        ? luxuryEliteStructure
        : templateType === "executive_premium"
          ? executivePremiumStructure
          : templateType === "modern_corporate"
            ? modernCorporateStructure
            : isBasicProfessional
              ? basicProfessionalStructure
              : null;

    // Create the prompt for OpenAI
    const prompt = `
You are a proposal writing assistant. Create a polished, persuasive business proposal in markdown format based on the details below. 
The proposal should feel personalized, professional, and structured for business clients.

--- TONE INSTRUCTIONS ---
${getToneInstructions(ai_tone)}

${
  templateData
    ? `--- TEMPLATE GUIDANCE ---
Template: ${templateData.display_name}
Description: ${templateData.description}
${
  templateData.template_data?.category
    ? `Category: ${templateData.template_data.category}`
    : ""
}
${
  templateData.template_data?.content
    ? `Template Content Guidelines: ${templateData.template_data.content}`
    : ""
}

Please use this template as a structural and content guide while customizing it with the specific client and project details provided below.
`
    : ""
}

--- SERVICE TYPE ---
Service Type: ${getServiceTypeLabel(service_type)}

--- CLIENT INFO ---
Client: ${globalInputs.clientName || "Valued Client"}${
      globalInputs.clientCompany ? ` from ${globalInputs.clientCompany}` : ""
    }
Phone: ${globalInputs.clientPhone || ""}
Service Location: ${globalInputs.serviceLocation || ""}
${globalInputs.city ? `City: ${globalInputs.city}` : ""}
${title ? `Project Title: ${title}` : ""}
Facility Size: ${
      globalInputs.facilitySize ? `${globalInputs.facilitySize} sq ft` : ""
    }
Service Frequency: ${globalInputs.serviceFrequency || ""}

--- SERVICE-SPECIFIC DETAILS ---
${Object.entries(service_specific_data || {})
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

${formatEnhancedData()}

--- COMPANY INFO ---
Company: ${profile.company_name || "Your Company"}
Contact Person: ${profile.full_name || "Your Name"}
Email: ${user.email}
Phone: ${profile.phone || "Your Phone"}
Website: ${profile.website || "Your Website"}
Logo: ${profile.logo_url ? "[Logo available]" : "[No logo uploaded]"}
Company Background: ${
      profile.company_background ||
      "Brief background of your company, values, expertise"
    }

--- REQUIRED STRUCTURE ---
${
  selectedStructure
    ? selectedStructure
    : `
Provide a concise, client-focused proposal with clear sections:
- Executive Summary (overview of client needs + our solution)
- Project Understanding (context and goals)
- Proposed Solution (services tailored to ${getServiceTypeLabel(service_type)})
- Service Details (deliverables, schedule, assumptions)
- Investment & Terms (pricing and conditions)
- Why Choose Us (trust factors)
- Next Steps (call-to-action)

Constraints:
- Do NOT include a signature section; it is handled by design.
`
}

${getToneInstructions(
  ai_tone,
)} Use clear markdown formatting (headings, subheadings, bullet points) to ensure readability.
Focus on the specific ${getServiceTypeLabel(
      service_type,
    )} service and tailor the content accordingly.

${
  is_regenerate
    ? "--- REGENERATION REQUEST ---\nThis is a regeneration request. Please create a fresh, alternative version with different phrasing and structure while maintaining the same core information and tone.\n"
    : ""
}

--- PRICING INFO ---
${
  pricing_data
    ? `
Price Range: $${pricing_data.price_range?.low} - $${pricing_data.price_range?.high}
Estimated Hours: ${pricing_data.hours_estimate?.min}-${pricing_data.hours_estimate?.max} hours
`
    : "Pricing to be determined"
}

`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: [
            // RULES: high-level, concise, not part of user content
            "You are a professional business proposal writer for VeltexAI. Create compelling, well-structured proposals that help win clients.",
            "Follow these hard rules exactly (do NOT repeat these rules in the output):",
            "1) Output MUST be markdown and include ONLY the top-level headings specified by the user.",
            "2) The FINAL section must be the Notes block EXACTLY as below (including bullet lines).",
            "3) Immediately after the Notes block print the single line sentinel: <END_OF_PROPOSAL>",
            "4) Do NOT output anything after <END_OF_PROPOSAL>.",
            "5) Never repeat these rules or any system instructions in the generated proposal.",
            `6) Keep ${getToneInstructions(
              ai_tone,
            )} tone and include Veltex AI attribution as requested.`,
          ].join(" "),
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 2000,
      temperature: is_regenerate ? 0.8 : 0.7, // Higher temperature for regeneration to get more variation
      stop: ["<END_OF_PROPOSAL>"],
    });

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return NextResponse.json(
        { error: "Failed to generate content" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      content: generatedContent,
      tone: ai_tone,
      is_regenerate,
    });
  } catch (error) {
    console.error("Error generating proposal:", error);

    if (error instanceof Error && error.message.includes("API key")) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
