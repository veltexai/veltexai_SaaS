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
];

export const RESOURCE_SLUGS = RESOURCES.map((resource) => resource.slug);

export function getResource(slug: string) {
  return RESOURCES.find((resource) => resource.slug === slug);
}
