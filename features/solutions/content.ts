export type SolutionSection = { title: string; body: string };
export type SolutionFAQ = { question: string; answer: string };

export type Solution = {
  slug: string;
  audience: string;
  title: string;
  description: string;
  intentLabel: string;
  summary: string;
  painTitle: string;
  painIntro: string;
  challenges: string[];
  workflowTitle: string;
  workflowIntro: string;
  workflow: SolutionSection[];
  checklistTitle: string;
  checklistIntro: string;
  checklist: string[];
  example: { title: string; intro: string; assumptions: string[]; steps: string[]; takeaway: string };
  proposalTitle: string;
  proposalIntro: string;
  inclusions: string[];
  exclusions: string[];
  options: string[];
  faq: SolutionFAQ[];
  ctaTitle: string;
  ctaBody: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

export const SOLUTIONS: Solution[] = [
  {
    slug: "commercial-cleaning-proposal-software",
    audience: "Commercial cleaning companies",
    title: "Commercial Cleaning Proposal Software Built for Clearer Bids",
    description: "Turn walkthrough notes, service assumptions, pricing, and exclusions into a professional commercial cleaning proposal your prospect can evaluate and your operations team can deliver.",
    intentLabel: "Proposal creation and presentation",
    summary: "A commercial cleaning proposal has two jobs: help a buyer understand what they are purchasing and give the cleaning company a reliable record of what it promised. Veltex AI brings facility details, service scope, pricing, and presentation into one cleaning-specific workflow. You still approve every task, assumption, and price before the proposal leaves your business.",
    painTitle: "A polished document cannot rescue an unclear scope",
    painIntro: "Many proposal problems begin before formatting. Walkthrough notes live on paper, pricing sits in a spreadsheet, and the previous customer's document becomes the starting point. The result may look complete while leaving important operating questions unanswered.",
    challenges: ["The monthly price is separated from the assumptions used to build it", "Service frequencies are described broadly instead of by area or task", "Periodic floor care, glass, and consumables disappear inside the base scope", "Exclusions and customer responsibilities are added late or omitted", "Different salespeople use inconsistent structure and terminology", "Operations receives a signed document that is difficult to launch"],
    workflowTitle: "Build the proposal from the walkthrough outward",
    workflowIntro: "A dependable workflow preserves the reasoning behind the offer instead of jumping directly to a price or generic template.",
    workflow: [
      { title: "Capture the facility", body: "Record building type, cleanable area, occupancy, access window, surfaces, restrooms, shared spaces, security requirements, and unusual conditions observed during the walkthrough." },
      { title: "Define the service promise", body: "Organize tasks by area and frequency. Separate recurring service from periodic projects so the buyer can see what happens every visit, weekly, monthly, or by request." },
      { title: "Review commercial assumptions", body: "Confirm labor, supplies, overhead, frequency, and margin inputs. Veltex AI organizes the estimate, but your company validates local wages, productivity, taxes, and contract risk." },
      { title: "Present a decision-ready offer", body: "Connect scope to price, make optional services visible, and state exclusions before the buyer approves the work." },
      { title: "Hand the agreement to operations", body: "Use the accepted scope as a launch reference so supervisors understand areas, frequencies, boundaries, and commitments without reconstructing the sale." },
    ],
    checklistTitle: "What to capture before writing the proposal",
    checklistIntro: "Two similarly sized facilities can require different labor and service plans. Capture the operating conditions behind the square footage.",
    checklist: ["Cleanable versus total building area", "Occupancy, traffic, operating hours, and permitted cleaning window", "Area inventory including offices, restrooms, food areas, entrances, stairs, and elevators", "Floor quantities and periodic maintenance expectations", "Supply, equipment, storage, utility, key, and alarm responsibilities", "Frequencies by area rather than one schedule for the building", "Startup or restorative work required before recurring service", "Quality-control, communication, and escalation expectations"],
    example: {
      title: "Illustrative structure: a recurring mixed-use office",
      intro: "Consider an illustrative 24,000-square-foot office requesting five evening visits per week. This demonstrates proposal structure, not a production-rate or price recommendation.",
      assumptions: ["Open offices, private rooms, restrooms, break areas, lobby, conference rooms, and circulation space are scoped separately", "Visit-level work is separated from weekly and monthly tasks", "Carpet extraction, floor restoration, exterior glass, and consumables are options or exclusions", "Access, utilities, and storage responsibilities are documented"],
      steps: ["Keep labor and cost assumptions in the internal estimate", "Show the customer a scope organized by area and frequency", "Separate recurring service from startup work and periodic options", "State the change process for added areas, tasks, or frequency"],
      takeaway: "The value is traceability: the final proposal can be checked against the walkthrough, estimate, and launch plan before it is sent.",
    },
    proposalTitle: "Make the boundaries as clear as the benefits",
    proposalIntro: "Adapt every item to the actual walkthrough and contract; never assume a generic list applies unchanged.",
    inclusions: ["Areas and recurring tasks by frequency", "Quality-control and communication expectations", "Agreed equipment, supplies, and schedule"],
    exclusions: ["Hazardous or regulated material handling unless expressly qualified", "Restorative work not identified during the walkthrough", "Services outside the listed areas, frequency, or access window"],
    options: ["Periodic carpet extraction or hard-floor care", "Interior glass or high-detail cleaning", "Consumable management and approved project work"],
    faq: [
      { question: "What is commercial cleaning proposal software?", answer: "It organizes facility details, scope, commercial assumptions, and presentation into a customer-facing cleaning proposal rather than starting from a blank document." },
      { question: "Does Veltex AI decide what I should charge?", answer: "No. It helps organize inputs and calculations, but you validate labor, production, overhead, margin, taxes, and requirements for your company and market." },
      { question: "Can recurring and optional work be separated?", answer: "Yes. Keeping base service, periodic work, and add-ons separate helps buyers understand exactly what the monthly amount includes." },
      { question: "Is the generated proposal automatically final?", answer: "No. Review scope, assumptions, exclusions, pricing, and customer details before sending. Your approval remains the final control." },
    ],
    ctaTitle: "See the proposal experience before creating an account",
    ctaBody: "Inspect how facility information, service scope, and pricing can become a customer-ready cleaning proposal.",
    primaryCta: { label: "Try the proposal demo", href: "/demo-proposal" },
    secondaryCta: { label: "Start a free trial", href: "/auth/signup?from=commercial-cleaning-proposal-software" },
  },
  {
    slug: "janitorial-bidding-software",
    audience: "Janitorial contractors",
    title: "Janitorial Bidding Software for Labor-Informed Estimates",
    description: "Build a janitorial estimate from production assumptions, visits, labor burden, overhead, scope risk, and target margin before turning the approved number into a proposal.",
    intentLabel: "Estimating and bid economics",
    summary: "Janitorial bidding begins with operational math, not document design. Veltex AI helps contractors organize the variables that turn a facility walkthrough into labor hours, cost, and an editable bid. The goal is a number you can explain and revise—not a price produced by an opaque rule.",
    painTitle: "Square footage is an input, not the bid",
    painIntro: "A square-foot rate can be a useful comparison, but using it alone hides the work. Restroom density, floor mix, congestion, frequency, travel, access restrictions, and periodic tasks affect the labor plan.",
    challenges: ["Using one production assumption for areas that clean at different speeds", "Confusing wage rate with fully burdened labor cost", "Applying frequency without documenting the monthly conversion", "Adding margin as markup and producing a different result", "Leaving supervision, supplies, equipment, and overhead outside the estimate", "Changing scope after pricing without recalculating labor"],
    workflowTitle: "A defensible bid has an audit trail",
    workflowIntro: "Each stage should expose an assumption the estimator can verify. When an input changes, the affected result should be easy to identify.",
    workflow: [
      { title: "Segment the building", body: "Break the facility into work types such as restrooms, office space, food areas, entrances, open floor, and periodic floor care instead of averaging away labor-intensive zones." },
      { title: "Estimate time by work type", body: "Choose production assumptions appropriate to the task, surface, density, equipment, and service standard. Record the internal or sourced basis for later review." },
      { title: "Convert visits into monthly labor", body: "Multiply hours per visit by the service schedule and your documented weeks-per-month convention. Include supervision, setup, quality control, and non-routine labor where applicable." },
      { title: "Build total cost", body: "Apply burdened labor cost and add supplies, equipment, overhead, travel, insurance allocation, and other costs your business must recover." },
      { title: "Apply and verify margin", body: "Set the selling price using your chosen margin method, calculate the resulting gross dollars and percentage, then compare the plan with operational reality." },
    ],
    checklistTitle: "Inputs to validate before approving a bid",
    checklistIntro: "The estimator—not the software—owns these inputs. Veltex AI provides a consistent place to organize and review them.",
    checklist: ["Cleanable quantities by area, surface, fixture, or task unit", "Production assumptions and the basis for each", "Hours per visit, visits per week, and monthly conversion method", "Direct wage plus payroll burden and labor-related costs", "Consumables, chemicals, equipment, and replacement allowance", "Supervision, training, relief coverage, travel, and administrative overhead", "Startup work, periodic service, uncertainty, and contingency", "Target margin and backward check against planned labor hours"],
    example: {
      title: "Illustrative math: follow assumptions, not a benchmark",
      intro: "Assume your own walkthrough produces 3.5 labor hours per visit and the prospect requests five weekly visits. These figures are illustrative, not recommended production rates.",
      assumptions: ["The company uses 4.33 weeks per month", "Verified burdened labor cost is $24 per hour", "Company-specific non-labor cost allocation is $420 monthly", "The estimator tests a 25% gross margin on modeled cost"],
      steps: ["Monthly labor: 3.5 × 5 × 4.33 = 75.78 hours", "Labor cost: 75.78 × $24 = $1,818.72", "Modeled cost: $1,818.72 + $420 = $2,238.72", "Price at 25% margin: $2,238.72 ÷ 0.75 = $2,984.96"],
      takeaway: "Replace every assumption with verified company figures, then inspect the resulting labor hours and scope before quoting a customer.",
    },
    proposalTitle: "Move from an approved estimate to a controlled offer",
    proposalIntro: "The customer may not need every cost line, but the estimator should retain them. The proposal expresses the service those calculations support.",
    inclusions: ["Approved recurring scope and frequency", "Selling price and billing cadence", "Operating assumptions that affect delivery"],
    exclusions: ["Unmeasured or unidentified work", "Customer changes after the estimate", "Specialized services without validated labor and qualifications"],
    options: ["Alternative service frequencies", "Separately priced periodic work", "Scope packages when operationally valid"],
    faq: [
      { question: "How is bidding software different from proposal software?", answer: "Bidding software emphasizes quantities, production, labor, cost, and margin. Proposal software emphasizes how the approved offer is organized and presented." },
      { question: "Are default production rates automatically correct?", answer: "No. Validate any rate against the facility, task, equipment, service level, and your crews." },
      { question: "What is the difference between markup and margin?", answer: "Markup divides profit by cost; margin divides profit by selling price. The same percentage produces different prices." },
      { question: "Can I bid by square foot?", answer: "Use it as a comparison if helpful, but the estimate should still account for time, frequency, burden, costs, scope, and risk." },
    ],
    ctaTitle: "Model the bid before formatting the proposal",
    ctaBody: "Test your labor, frequency, overhead, and margin assumptions, then carry the reviewed estimate into a proposal.",
    primaryCta: { label: "Use the bid calculator", href: "/tools/cleaning-bid-calculator" },
    secondaryCta: { label: "See a proposal example", href: "/demo-proposal" },
  },
  {
    slug: "office-cleaning-proposals",
    audience: "Office cleaning providers",
    title: "Office Cleaning Proposals That Define Recurring Service",
    description: "Separate office zones, task frequencies, consumable responsibilities, access conditions, and periodic services before the contract begins.",
    intentLabel: "Recurring office contracts",
    summary: "An office proposal must translate a familiar-looking building into a precise recurring service. Private rooms, shared work areas, restrooms, break rooms, entrances, and floor surfaces do not create the same workload. Veltex AI helps organize those differences into a scope a facility manager can review and a supervisor can launch.",
    painTitle: "‘General office cleaning’ leaves too much unanswered",
    painIntro: "A prospect may understand that phrase differently from the cleaning team. Establish the service rhythm and responsibility boundaries before small assumptions become repeated complaints.",
    challenges: ["Hybrid occupancy that changes by weekday", "High-use restrooms and break rooms inside lower-traffic space", "Desk and personal-item boundaries", "Alarm, key, elevator, parking, and after-hours procedures", "Consumable ordering and restocking responsibility", "Periodic floor, carpet, and glass work hidden inside the monthly price"],
    workflowTitle: "Turn the walkthrough into a service map",
    workflowIntro: "The service map connects each office zone to tasks, frequency, access, and quality expectations.",
    workflow: [
      { title: "Map occupancy and traffic", body: "Record employee and visitor patterns by day, identify collaboration and food areas, and note tenant spaces with different permissions or schedules." },
      { title: "Inventory recurring zones", body: "Separate offices, workstations, meeting rooms, reception, restrooms, break rooms, copy areas, corridors, stairs, elevators, and entrances." },
      { title: "Assign frequencies", body: "Describe visit-level work and what rotates weekly, monthly, quarterly, or by request. Do not promise daily completion of tasks priced as periodic work." },
      { title: "Clarify touch and access", body: "State rules for desks, personal items, electronics, confidential materials, locked rooms, alarms, keys, badges, and issue reporting." },
      { title: "Separate project work", body: "Show floor restoration, extraction, high glass, events, and other projects outside recurring service unless explicitly scheduled and priced." },
    ],
    checklistTitle: "Office walkthrough questions worth documenting",
    checklistIntro: "These questions reveal workload that a single building-wide assumption misses.",
    checklist: ["Which days have highest occupancy?", "How many fixtures, food areas, and waste points require service?", "Which desks or rooms should cleaners not touch?", "Who supplies paper products, liners, soap, and dispensers?", "Where can equipment be stored, filled, and charged?", "What keys, badges, alarms, or parking rules affect labor?", "Which floor services are recurring, periodic, optional, or excluded?", "How are deficiencies inspected and corrected?"],
    example: {
      title: "Illustrative scope: separate the service rhythms",
      intro: "Imagine a two-floor hybrid office with break rooms, restroom groups, carpeted work areas, and resilient entrance flooring. This shows organization, not a recommended price.",
      assumptions: ["Waste, restrooms, break rooms, entrances, and visible soil receive visit-level attention", "Private rooms follow agreed access rules and may rotate", "Routine floor care is distinguished from extraction or restoration", "Consumables come from customer inventory unless stated otherwise"],
      steps: ["Create an area schedule instead of one general paragraph", "List weekly detail separately from every-visit work", "Attach periodic floor-care options with their own approval", "Document the cleaning window and process for inaccessible areas"],
      takeaway: "The buyer can verify coverage, and the launch team gains a usable schedule. Future scope changes become visible instead of being absorbed silently.",
    },
    proposalTitle: "Office-specific boundaries to show explicitly",
    proposalIntro: "Routine service and variable requests should be visibly separated.",
    inclusions: ["Area-by-area task and frequency schedule", "Access and issue-reporting process", "Routine spotting and agreed replenishment duties"],
    exclusions: ["Handling personal papers or sensitive equipment", "Biohazard, pest, or regulated-waste service", "Unscheduled events and restorative floor work"],
    options: ["Carpet extraction and hard-floor maintenance", "Interior glass and partition detailing", "Day porter, event, or consumable management"],
    faq: [
      { question: "What should an office proposal include?", answer: "Include serviced areas, tasks, frequencies, schedule, price, supplies, access, quality process, exclusions, and periodic options." },
      { question: "Should every area use the same frequency?", answer: "Not necessarily. Restrooms, entrances, and food areas often need a different rhythm from private offices or low-use rooms." },
      { question: "How should consumables be handled?", answer: "Name who purchases, stores, monitors, and restocks them. State how contractor-supplied products are approved and priced." },
      { question: "Where should floor care appear?", answer: "Separate routine care from extraction, stripping, refinishing, and other restorative projects." },
    ],
    ctaTitle: "Build an office proposal buyers and supervisors can read",
    ctaBody: "Explore the workflow, then replace every illustration with conditions from your walkthrough.",
    primaryCta: { label: "Try the proposal demo", href: "/demo-proposal" },
    secondaryCta: { label: "Read the proposal guide", href: "/resources/how-to-write-commercial-cleaning-proposal" },
  },
  {
    slug: "post-construction-cleaning-proposals",
    audience: "Post-construction cleaning contractors",
    title: "Post-Construction Cleaning Proposals Organized by Phase",
    description: "Define rough, final, and touch-up cleaning with measurable assumptions, schedule dependencies, exclusions, allowances, and a change process.",
    intentLabel: "Phased project cleaning",
    summary: "Post-construction cleaning is a changing project rather than a stable route. Trade completion, debris, utility availability, sequencing, re-entry, and punch-list expectations can alter the work after the first walkthrough. A useful proposal makes those dependencies visible instead of hiding them inside one square-foot price.",
    painTitle: "The site can change faster than the quote",
    painIntro: "A proposal written from drawings or an early visit may not match conditions when cleaning begins. Phase definitions and change controls protect both parties when the schedule or surface condition moves.",
    challenges: ["Areas released out of sequence", "Other trades re-soiling completed work", "Trade debris mixed with fine-detail cleaning", "Adhesive, paint, grout haze, or film not identified during estimating", "Missing utilities, lighting, lifts, or secure storage", "Touch-up expectations becoming unlimited return visits"],
    workflowTitle: "Estimate the project as controlled phases",
    workflowIntro: "Each phase needs its own readiness conditions, deliverables, and acceptance point.",
    workflow: [
      { title: "Define release conditions", body: "State what must be complete before work starts: trade completion, debris removal, fixture installation, protection removal, utilities, and safe access." },
      { title: "Separate cleaning phases", body: "Describe rough, final, and touch-up work for the actual project. Do not assume those labels mean the same thing to every contractor." },
      { title: "Measure area and condition", body: "Record floor area, glass, fixtures, cabinets, ledges, specialty materials, elevation, and residues. Mark verified quantities and allowances." },
      { title: "Price access and sequencing", body: "Include mobilization, lift needs, restricted hours, parking, badges, floor protection, repeated setup, and fragmented releases where relevant." },
      { title: "Create a change path", body: "Define how rework, schedule changes, added areas, excessive debris, and concealed conditions are approved before extra work proceeds." },
    ],
    checklistTitle: "Conditions to verify before committing",
    checklistIntro: "Photos, dated notes, drawings, and written clarifications are useful while conditions evolve.",
    checklist: ["Exact areas and phase boundaries", "Responsibility for bulk debris and trade waste", "Surface types and manufacturer restrictions", "Glass quantities and access method", "Utilities, elevators, lifts, loading, parking, and storage", "Hours, sequencing, milestones, and schedule exposure", "Punch-list process and included return visits", "Allowance and change-order process for unknown conditions"],
    example: {
      title: "Illustrative structure: three releases, not one promise",
      intro: "Consider a renovation releasing two floors and a lobby on different dates. This demonstrates risk separation rather than a pricing benchmark.",
      assumptions: ["The general contractor removes trade debris before each phase", "Working power, water, lighting, and safe access are provided", "One final pass and one defined touch-up are included per release", "Trade re-entry and added residue follow the written change process"],
      steps: ["Price and describe each release separately", "Use allowances only for quantities not yet verified", "Document readiness and pre-existing conditions", "Accept completed work by release so unfinished areas do not hold it open"],
      takeaway: "Both parties gain a shared definition of readiness, completion, and changed work—more defensible than assuming an early rate describes every future condition.",
    },
    proposalTitle: "Project language that prevents scope drift",
    proposalIntro: "Make dependencies and variable work easy to locate rather than burying them in fine print.",
    inclusions: ["Named phases, areas, surfaces, and deliverables", "Included mobilizations and touch-up visits", "Readiness, documentation, and acceptance process"],
    exclusions: ["Trade debris or hazardous material unless included", "Damage correction and specialty restoration", "Re-cleaning caused by trade re-entry after acceptance"],
    options: ["Additional touch-up or remobilization", "High-access glass and specialty surfaces", "Allowance-based work with written authorization"],
    faq: [
      { question: "Should this work use one square-foot price?", answer: "Use it as a comparison only. Phases, condition, debris, access, glass, sequencing, and returns should shape the estimate." },
      { question: "What is a readiness condition?", answer: "It is a documented condition required before work starts, such as trade completion, debris removal, utilities, and safe access." },
      { question: "How should touch-up be defined?", answer: "Specify areas, timing, included visits, eligible work, and exclusions instead of promising unlimited return cleaning." },
      { question: "How are unknown conditions handled?", answer: "Use verified quantities where possible; otherwise state an allowance or rate and require written approval." },
    ],
    ctaTitle: "Turn changing site conditions into a controlled proposal",
    ctaBody: "Separate phases, assumptions, allowances, and optional work before the project begins.",
    primaryCta: { label: "Try the proposal demo", href: "/demo-proposal" },
    secondaryCta: { label: "Start a free trial", href: "/auth/signup?from=post-construction-cleaning-proposals" },
  },
  {
    slug: "medical-office-cleaning-proposals",
    audience: "Medical and dental office cleaning providers",
    title: "Medical Office Cleaning Proposals with Explicit Boundaries",
    description: "Document facility-approved tasks, clinical and non-clinical boundaries, responsibilities, frequencies, access, and exclusions without overstating capabilities.",
    intentLabel: "Medical office scope clarity",
    summary: "A medical or dental office proposal should be more specific than a general office scope, but specificity must not become an unsupported safety or compliance promise. Veltex AI helps providers document the facility's approved procedures, responsibilities, areas, frequencies, and exclusions for customer review.",
    painTitle: "Precision matters more than impressive language",
    painIntro: "Words such as sanitizing, disinfecting, terminal cleaning, or compliance can imply defined procedures and outcomes. Use only language your company is qualified to perform and the facility has approved.",
    challenges: ["Different rules for public, administrative, treatment, and staff areas", "Facility-selected products, contact times, and surface restrictions", "Sharps, regulated waste, medication, specimen, and equipment boundaries", "Privacy, keys, alarms, and restricted access", "Responsibilities divided between cleaners and clinical personnel", "Pressure to promise specialized work not evaluated or priced"],
    workflowTitle: "Build the scope with the facility, not around it",
    workflowIntro: "The customer approves procedures and boundaries. The proposal records that agreement; it does not replace facility policy, training, or product instructions.",
    workflow: [
      { title: "Classify areas and access", body: "Inventory public, administrative, staff, treatment, restroom, storage, and restricted spaces. Record availability and authorization." },
      { title: "Assign responsibility", body: "State what cleaners perform, what clinical staff retains, and what is excluded, especially for equipment, spills, sharps, waste, and patient materials." },
      { title: "Document approved methods", body: "Use customer-approved task language, products, tools, frequencies, and procedures without generalizing beyond agreed conditions." },
      { title: "Validate capability", body: "Confirm training, supervision, equipment, insurance, and procedures for every promised service. Remove or separately qualify work outside that capability." },
      { title: "Establish communication", body: "Name the process for access failures, spills, damaged surfaces, shortages, incidents, deficiencies, and out-of-scope requests." },
    ],
    checklistTitle: "Topics for facility approval",
    checklistIntro: "This is a scoping aid, not medical, infection-control, or legal advice. Requirements vary by facility and jurisdiction.",
    checklist: ["Area classification and restricted spaces", "Approved task lists, products, tools, and instructions", "Responsibility for equipment, spills, sharps, and regulated waste", "Facility-approved touchpoint lists and frequencies", "Public, restroom, administrative, and staff-area routines", "Privacy, security, key, and alarm requirements", "Supply ownership, storage, labeling, and replenishment", "Incident reporting, quality review, and change approval"],
    example: {
      title: "Illustrative structure: make responsibility visible",
      intro: "Imagine a dental office with reception, staff rooms, restrooms, operatories, sterilization areas, and equipment rooms. This example demonstrates documentation only.",
      assumptions: ["The facility supplies or approves treatment-area procedures and products", "Clinical staff retains instruments, sharps, regulated waste, medications, and sensitive equipment unless expressly agreed", "The provider services public and administrative areas on the documented schedule", "Every treatment-area task names an approved method and owner"],
      steps: ["Create a responsibility table by area and task", "Attach approved frequency and procedure references", "Place specialized exclusions beside routine inclusions", "Require review when rooms, equipment, products, or procedures change"],
      takeaway: "The proposal records who does what, where, when, and under whose procedure. That clarity is more useful than broad claims the contract cannot verify.",
    },
    proposalTitle: "Use careful language for specialized environments",
    proposalIntro: "Only promise work supported by the facility agreement and verified capability. Obtain qualified review for specialized requirements.",
    inclusions: ["Facility-approved routine tasks and frequencies", "Area and responsibility matrix", "Access, supply, communication, and quality procedures"],
    exclusions: ["Clinical duties or regulated waste unless qualified", "Unapproved work on medical or dental equipment", "Guaranteed pathogen-removal or compliance claims"],
    options: ["Approved periodic floor or carpet service", "Day porter support in public areas", "Additional service following an approved change"],
    faq: [
      { question: "Does this provide infection-control guidance?", answer: "No. It explains proposal structure. Obtain procedures from the facility and qualified sources and follow product instructions." },
      { question: "How should responsibilities be separated?", answer: "Use an area-and-task table showing what the provider performs, what facility staff performs, and what is excluded." },
      { question: "Can a proposal promise compliance?", answer: "Avoid broad guarantees. Describe specific tasks, procedures, records, and responsibilities and obtain professional review where needed." },
      { question: "What if facility procedures change?", answer: "Review and approve the new work, products, training, schedule, and price before changing the agreement." },
    ],
    ctaTitle: "Create a proposal around approved responsibilities",
    ctaBody: "Organize facility requirements while keeping every procedure, boundary, and commitment under your control.",
    primaryCta: { label: "Try the proposal demo", href: "/demo-proposal" },
    secondaryCta: { label: "Start a free trial", href: "/auth/signup?from=medical-office-cleaning-proposals" },
  },
  {
    slug: "warehouse-cleaning-proposals",
    audience: "Warehouse and industrial cleaning providers",
    title: "Warehouse Cleaning Proposals That Separate Work Zones",
    description: "Build a warehouse proposal around zone-specific production, operating windows, equipment, access, safety boundaries, floor conditions, and project work.",
    intentLabel: "Large-site and mixed-zone scopes",
    summary: "A warehouse is rarely one uniform cleaning area. Offices and restrooms require detailed recurring service while open floor, docks, racks, production-adjacent zones, and exterior transitions need different equipment, access, and productivity assumptions. Veltex AI helps turn that mixed environment into a readable scope.",
    painTitle: "Large square footage can hide the expensive work",
    painIntro: "A blended rate may make open floor appear to offset congested or high-detail zones. Without preserving those differences, the monthly total can look reasonable while planned labor is not.",
    challenges: ["Open floor, rack aisles, offices, and restrooms with different production", "Forklift, pedestrian, loading, and production traffic", "Dust, oil, packaging, or material outside routine janitorial scope", "Scrubber, sweeper, lift, charging, water, and storage requirements", "Restricted zones, escorts, badges, and orientation", "Cleaning windows interrupted by shipments or operations"],
    workflowTitle: "Estimate and present the warehouse by zone",
    workflowIntro: "Zone-level planning makes equipment, frequency, and responsibility visible before the selling price is approved.",
    workflow: [
      { title: "Map functional zones", body: "Measure offices, employee areas, restrooms, entrances, open floor, rack aisles, docks, mezzanines, stairs, and production-adjacent spaces." },
      { title: "Record operating constraints", body: "Document shifts, dock schedules, pedestrian rules, forklift routes, escorts, orientation, restricted access, and shutdown windows." },
      { title: "Match methods and equipment", body: "Separate manual detail from sweeping, scrubbing, extraction, or high dusting. Verify surfaces, utilities, storage, charging, and transport." },
      { title: "Model labor by zone", body: "Account for congestion, soil, travel, setup, dumping, refilling, edge work, and obstructions. Do not apply open-floor assumptions to restrooms or dense aisles." },
      { title: "Define changing conditions", body: "Clarify how spills, unusual debris, pallet movement, seasonal volume, construction, shutdowns, and added zones are requested and priced." },
    ],
    checklistTitle: "Warehouse measurements and constraints",
    checklistIntro: "A floor plan helps, but the operating walkthrough reveals when and how the space can be cleaned.",
    checklist: ["Area and layout by functional zone", "Surface, condition, soil, drains, edges, and obstructions", "Racks, aisle width, mezzanines, stairs, docks, and transitions", "Shifts, shipping peaks, shutdowns, escorts, and restrictions", "Equipment plus water, power, charging, dumping, and storage", "Responsibility for spills and operational debris", "Employee-area fixtures and replenishment duties", "Orientation, communication, reporting, and change authorization"],
    example: {
      title: "Illustrative structure: do not blend unlike work",
      intro: "Consider 70,000 square feet of open and racked floor plus 8,000 square feet of offices, restrooms, and break areas. This is not a rate recommendation.",
      assumptions: ["Employee areas receive detailed recurring service", "Open floor and aisles use separate equipment, frequency, and access assumptions", "Dock and production debris responsibilities are explicit", "Setup, refill, dumping, travel, edges, and restricted windows enter the labor review"],
      steps: ["Estimate employee zones independently from warehouse floor", "Separate machine-cleanable from obstructed area", "List routine work apart from spills, high dusting, and shutdown projects", "Show zone frequency even if the customer sees one monthly total"],
      takeaway: "The estimate retains operational detail while the proposal stays readable. If a zone or window changes, the affected labor can be recalculated.",
    },
    proposalTitle: "Show the operational boundaries",
    proposalIntro: "Warehouse contracts benefit from explicit responsibility for equipment, debris, access, and changed operating conditions.",
    inclusions: ["Zones, methods, equipment, and frequencies", "Agreed routine debris and floor responsibilities", "Access window, orientation, and reporting process"],
    exclusions: ["Hazardous material and unqualified spill response", "Moving inventory, pallets, machinery, or equipment", "Shutdown, high-access, or restorative projects not listed"],
    options: ["High dusting or elevated-access projects", "Periodic scrub, extraction, or restoration", "Shutdown cleaning and additional dock service"],
    faq: [
      { question: "Why not price the whole warehouse by square foot?", answer: "Open floor, aisles, docks, offices, restrooms, and food areas require different methods and labor assumptions." },
      { question: "What equipment belongs in the proposal?", answer: "Identify equipment when it affects method, access, storage, utilities, schedule, responsibility, or price." },
      { question: "How should operational debris be handled?", answer: "Define debris categories the provider removes and what remains the customer's responsibility." },
      { question: "Should safety requirements be generic?", answer: "No. Document customer-provided requirements and your verified procedures. Specialized risks need qualified review." },
    ],
    ctaTitle: "Build a warehouse proposal from zones that drive labor",
    ctaBody: "Organize the walkthrough, estimate, and proposal without flattening a mixed facility into one vague line item.",
    primaryCta: { label: "Use the bid calculator", href: "/tools/cleaning-bid-calculator" },
    secondaryCta: { label: "Try the proposal demo", href: "/demo-proposal" },
  },
];

export const SOLUTION_SLUGS = SOLUTIONS.map((solution) => solution.slug);
export const getSolution = (slug: string) => SOLUTIONS.find((solution) => solution.slug === slug);

export function getSolutionSearchText(solution: Solution): string {
  return [solution.audience, solution.title, solution.description, solution.intentLabel, solution.summary,
    solution.painTitle, solution.painIntro, ...solution.challenges, solution.workflowTitle,
    solution.workflowIntro, ...solution.workflow.flatMap((item) => [item.title, item.body]),
    solution.checklistTitle, solution.checklistIntro, ...solution.checklist, solution.example.title,
    solution.example.intro, ...solution.example.assumptions, ...solution.example.steps,
    solution.example.takeaway, solution.proposalTitle, solution.proposalIntro, ...solution.inclusions,
    ...solution.exclusions, ...solution.options, ...solution.faq.flatMap((item) => [item.question, item.answer]),
    solution.ctaTitle, solution.ctaBody].join(" ");
}
