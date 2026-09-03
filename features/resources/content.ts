export type ResourceSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type Resource = {
  slug: string;
  title: string;
  description: string;
  eyebrow: string;
  readTime: string;
  sections: ResourceSection[];
  sources?: { label: string; url: string }[];
};

export const RESOURCES: Resource[] = [
  {
    slug: "how-to-write-commercial-cleaning-proposal",
    title: "How to Write a Commercial Cleaning Proposal That Wins Contracts",
    description: "A practical, step-by-step framework for turning a walkthrough into a clear commercial cleaning proposal a facility manager can approve.",
    eyebrow: "Proposal guide",
    readTime: "8 min read",
    sections: [
      { heading: "Start with the buyer's decision", paragraphs: ["A strong cleaning proposal is not a brochure. It is a decision document. A facility manager should be able to see what will be cleaned, how often it will happen, what it costs, and what happens next without calling for clarification.", "Write for the person who attended the walkthrough and the people who did not. Clear assumptions and an itemized scope make the proposal easier to circulate internally."] },
      { heading: "The seven sections to include", paragraphs: ["Use the same dependable structure for every bid, then tailor the details to the facility."], bullets: ["Short cover letter tied to the prospect's priorities", "Facility summary and proposal assumptions", "Room-by-room or zone-by-zone scope of work", "Service frequency and schedule", "Labor, supplies, equipment, and exclusions", "Pricing, optional services, and payment terms", "Acceptance, start date, and next step"] },
      { heading: "Turn walkthrough notes into a scope", paragraphs: ["Group the property into logical zones such as offices, restrooms, break rooms, lobbies, and high-traffic areas. For each zone, state tasks and frequency. Avoid vague phrases like “general cleaning” when the buyer needs to compare bids.", "Call out periodic work separately. Floor finishing, carpet extraction, interior glass, and high dusting can distort the base monthly price if their timing is unclear."] },
      { heading: "Present pricing without creating confusion", paragraphs: ["Show the recurring monthly price prominently, then list one-time and optional services underneath it. Document the visit frequency and the number of service weeks used in your calculation. This helps protect margin when the schedule changes.", "Before sending, verify wages, payroll burden, production rate, supply costs, overhead, and target profit. A polished proposal cannot rescue an unprofitable price."] },
      { heading: "Use a final quality check", paragraphs: ["Confirm the prospect name, building address, square footage, frequencies, exclusions, price, expiration date, and contact details. Read the proposal once from the buyer's perspective: can they approve it today?", "Veltex AI turns these inputs into a consistent, branded proposal so your team can respond while the walkthrough is still fresh."] },
    ],
  },
  {
    slug: "how-to-bid-commercial-cleaning-jobs",
    title: "How to Bid Commercial Cleaning Jobs Without Guessing",
    description: "Learn the inputs, formulas, and margin checks behind a sustainable commercial janitorial bid.",
    eyebrow: "Bidding guide",
    readTime: "9 min read",
    sections: [
      { heading: "A bid is a labor model", paragraphs: ["Most commercial cleaning prices begin with labor. Square footage is useful, but two buildings of the same size can require very different effort. Restroom counts, floor types, density, security procedures, and service frequency all change the hours required.", "Estimate the work by area, convert it to labor hours, and only then build the selling price."] },
      { heading: "Collect the right walkthrough inputs", paragraphs: ["Do not price from square footage alone."], bullets: ["Cleanable square footage and facility type", "Service days per week and allowed work window", "Flooring mix and periodic floor-care requirements", "Restrooms, fixtures, kitchens, and high-touch areas", "Waste volume, access, security, and travel between zones", "Who provides consumables, chemicals, and equipment"] },
      { heading: "Calculate monthly labor cost", paragraphs: ["Estimate hours per visit and multiply by visits per month. A common planning factor for a weekly service is 4.33 weeks per month. Multiply monthly hours by the fully burdened hourly labor cost—not just the cleaner's wage.", "Burden can include payroll taxes, workers' compensation, paid time off, supervision, and other employee-related costs. Use your actual numbers whenever possible."] },
      { heading: "Add non-labor costs and profit", paragraphs: ["Add supplies, equipment, travel, insurance allocation, administration, and a contingency appropriate to the job. Then apply your desired profit margin. Margin and markup are not the same: dividing cost by one minus the target margin produces a margin-based selling price.", "For example, a $4,000 monthly cost at a 20% target margin yields a $5,000 selling price: $4,000 ÷ 0.80."] },
      { heading: "Pressure-test before submitting", paragraphs: ["Check what happens if production is slower than expected, wage rates rise, or the client requests an extra service day. Clearly separate optional work so the base contract remains comparable.", "Use the free bid calculator to model the price, then create a proposal that records the scope and assumptions behind it."] },
    ],
  },
  {
    slug: "commercial-cleaning-pricing-guide",
    title: "Commercial Cleaning Pricing Guide: Labor, Margin, and Frequency",
    description: "A plain-language guide to commercial cleaning pricing models and the variables that protect janitorial profit.",
    eyebrow: "Pricing guide",
    readTime: "7 min read",
    sections: [
      { heading: "Choose the model that matches the job", paragraphs: ["Commercial cleaners commonly price by labor hour, square foot, visit, or recurring month. The customer may see a monthly price while your internal estimate still starts with labor hours.", "Hourly pricing is transparent for uncertain scopes. Per-visit and monthly pricing are easier for recurring contracts. Square-foot pricing is a useful benchmark, but it should not replace a walkthrough-based labor estimate."] },
      { heading: "Frequency changes more than visit count", paragraphs: ["A five-day schedule does not always cost exactly five times a one-day schedule. More frequent service can reduce soil buildup, while each visit still carries setup, travel, opening, and closing time. Model actual hours per visit at each proposed frequency."] },
      { heading: "Protect the gross margin", paragraphs: ["Track direct labor, labor burden, supplies, and job-specific equipment against revenue. Then decide which overhead costs must be covered by the contract. If the scope changes, update the labor model before agreeing to the request.", "A clear change-order process protects both sides: the client understands the added cost, and the cleaning company avoids silently absorbing new work."] },
      { heading: "Offer choices carefully", paragraphs: ["A good-better-best structure can work when each option has a meaningful service difference—for example, three versus five visits per week or base cleaning versus added periodic floor care. Do not create options that make the buyer decipher tiny task differences."] },
    ],
  },
  {
    slug: "janitorial-scope-of-work-template",
    title: "Janitorial Scope of Work Template and Checklist",
    description: "Build a precise janitorial scope of work using this facility-by-facility checklist and frequency framework.",
    eyebrow: "Scope template",
    readTime: "6 min read",
    sections: [
      { heading: "Define scope by area and frequency", paragraphs: ["A usable scope tells the crew what to do and tells the client what to expect. Organize tasks by area, then attach a frequency such as every visit, weekly, monthly, quarterly, or as requested."] },
      { heading: "Core area checklist", paragraphs: ["Adapt this list to the walkthrough rather than copying every item into every proposal."], bullets: ["Entrances and lobbies: glass, doors, mats, hard floors, and touchpoints", "Offices: waste, dusting, vacuuming, spot cleaning, and accessible surfaces", "Restrooms: fixtures, dispensers, mirrors, partitions, floors, and replenishment", "Break rooms: counters, sinks, appliance exteriors, tables, floors, and waste", "Common areas: corridors, stairs, elevators, furniture, and touchpoints", "Periodic services: carpet extraction, floor refinishing, high dusting, and interior glass"] },
      { heading: "Record exclusions and responsibilities", paragraphs: ["State who supplies liners, paper products, soap, chemicals, and equipment. Note inaccessible areas, biohazard work, exterior windows, moving heavy furniture, and services that require separate authorization.", "Documenting exclusions is not unfriendly. It prevents a mismatch between the price and the expected result."] },
      { heading: "Make the scope operational", paragraphs: ["Include service days, access hours, alarm procedures, key control, quality inspections, issue reporting, and the client contact. The best proposal scope can become the crew's first work plan after award."] },
    ],
  },
  {
    slug: "cleaning-proposal-software-vs-template",
    title: "Cleaning Proposal Software vs. Word and PDF Templates",
    description: "Compare proposal software with Word, PDF, and spreadsheet workflows for a growing cleaning business.",
    eyebrow: "Software guide",
    readTime: "6 min read",
    sections: [
      { heading: "Templates work until repetition becomes friction", paragraphs: ["A Word or PDF template can be enough for a new cleaning company that sends a few simple quotes. The problem appears when the team repeatedly copies old client details, rebuilds scopes, transfers prices from spreadsheets, and fixes formatting before every send."] },
      { heading: "Where dedicated software helps", paragraphs: ["Proposal software can keep scope, pricing, branding, and client details in one workflow."], bullets: ["Faster turnaround after a walkthrough", "Consistent proposal structure across salespeople", "Reusable cleaning-specific scopes", "Fewer copy-and-paste and arithmetic errors", "Saved proposals and standardized branding"] },
      { heading: "When a template may still be enough", paragraphs: ["Stay with a template if bid volume is low, services are highly standardized, and one person controls every proposal. Move to software when proposal delays cost opportunities, pricing knowledge lives in one person's head, or inconsistent documents weaken the brand."] },
      { heading: "Evaluate with a real bid", paragraphs: ["Do not compare tools from feature lists alone. Recreate a recent office or facility bid, measure the time required, inspect the final proposal, and confirm that you can adjust the scope and pricing before sending.", "Veltex AI offers a no-signup demo proposal and a free trial so a cleaning company can test the complete output with realistic information."] },
    ],
  },
  {
    slug: "commercial-cleaning-walkthrough-checklist",
    title: "Commercial Cleaning Walkthrough Checklist for Better Bids",
    description: "Capture the building, scope, access, and service details needed to produce a confident commercial cleaning bid.",
    eyebrow: "Walkthrough checklist",
    readTime: "7 min read",
    sections: [
      { heading: "Walk the building in a repeatable order", paragraphs: ["Use the same discovery sequence on every site: business goals, building facts, area-by-area inspection, service logistics, quality expectations, and decision process. Consistency reduces forgotten details and makes bids easier to review later."] },
      { heading: "Building and scope questions", paragraphs: ["Capture facts that materially change labor and cost."], bullets: ["Total and cleanable square footage", "Occupancy, operating hours, and public traffic", "Flooring type and condition by area", "Restroom and fixture counts", "Waste volume and disposal route", "Requested frequency and periodic work", "Supply, equipment, and consumable responsibilities"] },
      { heading: "Access and risk questions", paragraphs: ["Ask about keys, badges, alarms, parking, elevators, loading areas, secure rooms, background checks, and required training. Record unusually long travel between areas and any restricted cleaning window.", "Photograph only with permission. Label notes by room or zone so they can be converted into the final scope without relying on memory."] },
      { heading: "Close the walkthrough with a next step", paragraphs: ["Confirm who decides, what matters most, when the proposal is due, and how the buyer wants it delivered. Repeat the critical assumptions aloud. A fast proposal is valuable only when it reflects what the prospect actually requested."] },
    ],
  },
  {
    slug: "commercial-cleaning-cost-per-square-foot",
    title: "Commercial Cleaning Cost per Square Foot: A Transparent Pricing Model",
    description: "Calculate commercial cleaning cost per square foot from labor, frequency, overhead, and margin instead of relying on an unsupported average.",
    eyebrow: "Benchmark analysis", readTime: "10 min read",
    sections: [
      { heading: "Price per square foot should be an output", paragraphs: ["A square-foot price helps compare bids, track a portfolio, and flag an estimate for review. It is a weak starting point when buildings have different restrooms, flooring, occupancy, security, cleaning windows, or service expectations. Build from labor and cost first, then divide the finished monthly price by cleanable area.", "This sequence keeps a convenient benchmark from becoming an unsupported guess. The final ratio summarizes the model; it does not explain why the work costs what it does."] },
      { heading: "Measure cleanable area", paragraphs: ["Gross building area may include mechanical rooms, tenant-controlled space, shafts, storage, or areas outside the contract. Cleanable square footage is the portion the crew will actually service. Confirm it during the walkthrough and separate spaces with a different task mix.", "A 20,000-square-foot office with 17,000 cleanable square feet should not be priced as though every foot receives identical work. Record carpet, hard floor, restrooms, break rooms, private offices, public areas, and periodic services separately."] },
      { heading: "Convert production into monthly hours", paragraphs: ["Divide cleanable square footage by an effective whole-building production assumption to estimate hours per visit. Multiply by visits per week and 4.33 average weeks per month. At 20,000 square feet and 3,500 square feet per labor hour, the plan begins at about 5.7 hours per visit.", "Production is not universal. ISSA notes that the standard of clean, scope, facility type, tools, training, and whether work is daily or restorative affect workloading. Replace planning assumptions with task-level time studies and actual job results."] },
      { heading: "Build the selling price", paragraphs: ["Multiply monthly hours by wage and labor burden. Add chemicals, supplies, equipment, travel, supervision, insurance, administration, and other job costs. Apply target margin by dividing cost by one minus the margin rather than adding that percentage as markup.", "A $4,000 monthly operating cost at a 20% target margin requires a $5,000 price. On 20,000 cleanable square feet, that is $0.25 per square foot per month. Always label whether a comparison rate is per visit, month, or year."] },
      { heading: "Compare matching scopes", paragraphs: ["Check whether a benchmark includes consumables, periodic floor work, porter coverage, equipment, management, taxes, and startup. A lower figure may describe a narrower contract rather than a more efficient company.", "Track completed work by facility type, size, frequency, budgeted hours, actual hours, and achieved margin. An internal range becomes more useful than a national average because it reflects your crews, market, tools, and service promise."] },
      { heading: "Pressure-test the proposal", paragraphs: ["Model slower production, wage changes, added visits, supply variance, and a lower achieved margin. Document exclusions and optional work so the customer can compare the base offer without assuming periodic services are included.", "Use the Veltex benchmark report to explore facility scenarios, then move the chosen assumptions into the bid calculator. The proposal should preserve the scope, frequency, price, and exclusions behind the approved estimate."] },
    ],
    sources: [{ label: "ISSA Cleaning Workload Fact Sheet", url: "https://access.issa.com/wp-content/uploads/ISSA-Cleaning-Workload-Fact-Sheet.pdf" }, { label: "ISSA: How to Calculate Cleaning Times", url: "https://korea.issa.com/articles/how-to-calculate-cleaning-times" }],
  },
  {
    slug: "janitorial-production-rates",
    title: "Janitorial Production Rates: Build and Validate Your Own Benchmarks",
    description: "Model janitorial production rates by task and facility, run time studies, and replace generic assumptions with operating evidence.",
    eyebrow: "Workloading guide", readTime: "11 min read",
    sections: [
      { heading: "No single production rate fits every job", paragraphs: ["A production rate expresses output per labor hour, often in square feet per hour. It is meaningful only when the scope is understood. Emptying waste in open offices, cleaning dense restrooms, vacuuming clear carpet, and restoring a floor require different tasks, tools, and time.", "A whole-building rate can support an early estimate, but it blends many activities. Treat it as a hypothesis until areas, frequencies, service standards, equipment, and labor have been modeled."] },
      { heading: "Define the service standard first", paragraphs: ["State what acceptable work looks like before calculating speed. Identify which surfaces are serviced every visit, which receive spot cleaning, and which periodic tasks occur monthly, quarterly, or annually.", "Heavy traffic, healthcare protocols, food areas, public spaces, security, and detailed reporting may reduce effective output. Open floors with appropriate powered equipment may increase it. The rate must describe the operating system actually promised."] },
      { heading: "Run a repeatable time study", paragraphs: ["ISSA recommends choosing a task, measuring the area, recording multiple observations, averaging the time, adjusting for variables, and refining the result. Observe normal work rather than a race. Include setup, replenishment, travel, and closeout when they are paid job time.", "Calculate task production by dividing 60 by average minutes and multiplying by measured square footage. Multiple observations are stronger than one, and separate studies are appropriate when layout, soil, equipment, or crew configuration changes."] },
      { heading: "Roll tasks into a building workload", paragraphs: ["List tasks and annual frequency for each space type. Divide applicable area by task production, multiply by occurrences, and total the hours for offices, restrooms, corridors, entrances, stairs, break rooms, and periodic work.", "Convert annual hours into weekly and monthly staffing, then compare them with the allowed service window. If the workload requires twelve labor hours inside four hours, the operating plan needs at least three productive workers plus realistic supervision and variation allowances."] },
      { heading: "Explain operating variance", paragraphs: ["Do not record only budget versus actual time. Capture why results moved: occupancy, waste, equipment failure, distant closets, security delays, scope changes, training, or layout. That evidence shows whether the assumption or the process needs correction.", "Review complaint rates, inspections, injuries, rework, turnover, and labor hours together. A faster rate that produces callbacks, unsafe shortcuts, or a lost customer is not useful efficiency."] },
      { heading: "Feed actual results back into bidding", paragraphs: ["Compare the proposed workload with the first weeks of actual performance. Correct measurements, routes, frequencies, training, staffing, or price while evidence is fresh. Preserve updated rates by facility and task for later bids.", "Review at least one normal service cycle and one demanding cycle before treating the result as stable. Keep the original assumption beside the observed range so future estimators can see both the decision and the evidence that changed it. Version the rate when equipment or scope changes instead of overwriting its history.", "The benchmark explorer offers an editable starting point; the detailed calculator converts hours into cost. The final proposal records the task and frequency commitments that the workload must support."] },
    ],
    sources: [{ label: "ISSA: How to Calculate Cleaning Times", url: "https://korea.issa.com/articles/how-to-calculate-cleaning-times" }, { label: "ISSA Cleaning Industry Management Standard", url: "https://go.issa.com/wp-content/uploads/2019/05/cims_standard.pdf" }],
  },
  {
    slug: "cleaning-labor-cost-burden",
    title: "Cleaning Labor Cost and Payroll Burden in a Janitorial Bid",
    description: "Build a burdened cleaning labor rate using wages, payroll costs, benefits, paid time, insurance, supervision, and local operating facts.",
    eyebrow: "Labor cost guide", readTime: "10 min read",
    sections: [
      { heading: "The wage is not the labor cost", paragraphs: ["A cleaner’s wage is the most visible input, but a contract must recover more than productive task time. Employer payroll taxes, workers’ compensation, unemployment insurance, paid leave, benefits, training, uniforms, and nonproductive time may affect the cost of one billable hour.", "If a bid multiplies job hours by wage alone, missing costs are absorbed by overhead, reduce margin, or create pressure to rush. A burdened rate makes the estimate more honest before it reaches the customer."] },
      { heading: "Use wage evidence as an anchor", paragraphs: ["The U.S. Bureau of Labor Statistics reported a $17.71 median hourly wage for janitors and building cleaners in May 2025. Workers in services to buildings and dwellings had a $17.21 median. These are national references, not recommendations for a specific city or contract.", "Use the wage required to recruit and retain the job’s crew. Account for shifts, unions, prevailing wage, healthcare, background checks, and customer requirements. National data cannot override local law or a labor agreement."] },
      { heading: "Separate burden components", paragraphs: ["Begin with employer payroll taxes and required insurance. Add expected paid leave, health or retirement benefits, bonuses, and other compensation. Then include paid activity that supports service but is missing from productive task minutes.", "BLS reported that benefits represented 30.1% of total private-industry compensation in March 2026. That broad figure includes industries unlike many cleaning companies, so it provides context rather than a default percentage."] },
      { heading: "Calculate a burdened hourly factor", paragraphs: ["One method divides expected annual employer labor cost by productive annual hours. Another applies a burden percentage to wage for early planning. At an $18 wage and 25% modeled burden, the burdened rate is $22.50 before supplies and overhead.", "The productive-hours method reveals how holidays, leave, training, meetings, and utilization reduce hours available for customer work. Document the method so costs are not duplicated later."] },
      { heading: "Keep supervision and overhead visible", paragraphs: ["Decide whether site supervision is direct labor, a job line, or overhead, and apply the rule consistently. Operations management, estimating, accounting, sales, insurance, software, vehicles, and office costs also need a deliberate allocation.", "Avoid hiding every expense inside one labor multiplier. A separated model lets estimators update wage, benefits, supervision, and overhead without accidentally charging an item twice."] },
      { heading: "Test wage and productivity together", paragraphs: ["A lower wage does not guarantee a lower delivered cost if turnover, retraining, absence, or slower production increases hours. A higher hourly wage with stable staffing and stronger output can produce a more reliable contract.", "Pressure-test overtime, coverage, wage increases, and slower production. After launch, compare budgeted labor with payroll and timekeeping results. Feed the difference into the next estimate and into any necessary scope review.", "Keep recruiting, onboarding, relief coverage, and supervisor time visible even when they are not charged directly to one visit. Consistent classification makes contract comparisons meaningful and shows whether a wage decision changes total labor economics rather than merely moving cost between categories."] },
    ],
    sources: [{ label: "BLS: Janitors and Building Cleaners", url: "https://www.bls.gov/ooh/building-and-grounds-cleaning/janitors-and-building-cleaners.htm" }, { label: "BLS: Employer Costs for Employee Compensation", url: "https://www.bls.gov/news.release/ecec.nr0.htm" }],
  },
  {
    slug: "cleaning-profit-margin-vs-markup",
    title: "Cleaning Profit Margin vs. Markup: Formulas for Janitorial Bids",
    description: "Understand margin versus markup, calculate the price required by a target margin, and pressure-test commercial cleaning profitability.",
    eyebrow: "Profitability guide", readTime: "9 min read",
    sections: [
      { heading: "Margin and markup answer different questions", paragraphs: ["Markup measures profit relative to cost. Margin measures profit relative to selling price. Both can describe one bid, but the percentages are not equal. Confusing them creates a lower price than intended and makes job reports hard to compare.", "If operating cost is $4,000 and the company adds 20% markup, price is $4,800. The $800 gross profit is 16.7% of revenue. A true 20% target margin requires a $5,000 price and $1,000 gross profit."] },
      { heading: "Use the target-margin formula", paragraphs: ["Selling price equals cost divided by one minus target margin as a decimal. At 25% margin, divide by 0.75. At 30%, divide by 0.70. Put the formula in the estimating system instead of relying on mental arithmetic or a copied spreadsheet cell.", "Profit equals selling price minus operating cost. Achieved margin equals that profit divided by selling price. These formulas make the intended and actual result comparable."] },
      { heading: "Define the cost base", paragraphs: ["Margin is meaningful only when cost is complete. Include burdened labor, chemicals, equipment, included consumables, travel, direct supervision, and deliberate overhead. If a major cost sits outside the base, reported margin overstates contract economics.", "Separate recurring work from periodic services and one-time startup. A profitable monthly rate may still lose money early if restoration, equipment delivery, training, or transition labor was omitted."] },
      { heading: "Distinguish gross margin from net profit", paragraphs: ["Job gross margin usually measures revenue remaining after defined direct or operating costs. Net profit remains after all company expenses. Companies classify supervision and overhead differently, so comparisons require matching definitions.", "Write an internal policy defining direct labor, burden, supplies, equipment, supervision, allocated overhead, and profit. Use it in estimating and financial reporting so sales and operations discuss the same metric."] },
      { heading: "Pressure-test the target", paragraphs: ["Run scenarios for slower production, wage growth, added frequency, supply inflation, scope requests, and service recovery. A bid that reaches its target only under perfect conditions has little room for normal variation.", "If a buyer needs a lower price, reduce a clear frequency or service component instead of silently accepting weaker economics on the same promise. This preserves comparability and expectations."] },
      { heading: "Manage margin after award", paragraphs: ["Compare actual labor and purchases with the estimate regularly. Investigate variance rather than demanding speed without context. Occupancy, building changes, access delays, and added tasks may require a scope conversation.", "Set review thresholds before the job starts. A small weekly variance may be noise, while a repeated monthly miss deserves a root-cause review. Separate price variance, wage variance, hour variance, supply variance, and scope variance so the corrective action matches the problem.", "Do not wait for contract renewal to discuss a material change. Bring the documented assumption, observed result, and proposed adjustment to the customer. That creates a more credible change-order conversation than a surprise price increase unsupported by operating evidence.", "Use the benchmark report to see margin sensitivity, then move the selected target into the calculator and proposal. Optional work and assumptions should remain visible after the sale."] },
    ],
    sources: [{ label: "ISSA Cleaning Industry Management Standard", url: "https://go.issa.com/wp-content/uploads/2019/05/cims_standard.pdf" }, { label: "Veltex AI 2026 Benchmark Report", url: "https://www.veltexai.com/resources/commercial-cleaning-benchmark-report" }],
  },
];

export const RESOURCE_SLUGS = RESOURCES.map((resource) => resource.slug);

export function getResource(slug: string) {
  return RESOURCES.find((resource) => resource.slug === slug);
}
