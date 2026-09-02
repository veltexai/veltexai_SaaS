export type Solution = {
  slug: string;
  audience: string;
  title: string;
  description: string;
  challenges: string[];
  scope: string[];
  outcomes: string[];
};

export const SOLUTIONS: Solution[] = [
  {
    slug: "commercial-cleaning-proposal-software",
    audience: "Commercial cleaning companies",
    title: "Commercial Cleaning Proposal Software Built for Faster Bids",
    description: "Create consistent scopes, pricing, and branded commercial cleaning proposals without rebuilding every bid from Word documents and spreadsheets.",
    challenges: ["Slow turnaround after facility walkthroughs", "Pricing assumptions scattered across spreadsheets", "Inconsistent proposals between salespeople", "Generic templates that miss cleaning-specific scope details"],
    scope: ["Office and common-area cleaning", "Restroom cleaning and replenishment", "Floor care and periodic services", "Service frequency, exclusions, and options"],
    outcomes: ["Respond while the opportunity is still active", "Give buyers a clear scope they can circulate", "Keep proposal structure and branding consistent"],
  },
  {
    slug: "janitorial-bidding-software",
    audience: "Janitorial contractors",
    title: "Janitorial Bidding Software for Clear, Profitable Proposals",
    description: "Turn walkthrough details and labor assumptions into a professional janitorial bid with a scope the client and cleaning team can understand.",
    challenges: ["Guessing from square footage alone", "Forgetting access, supply, or frequency assumptions", "Manual proposal formatting", "Difficulty separating recurring and periodic work"],
    scope: ["Area-by-area task descriptions", "Daily, weekly, and periodic frequencies", "Labor-informed pricing inputs", "Base service and optional add-ons"],
    outcomes: ["Document the assumptions behind the number", "Reduce copy-and-paste mistakes", "Build a repeatable bidding process"],
  },
  {
    slug: "office-cleaning-proposals",
    audience: "Office cleaning providers",
    title: "Office Cleaning Proposal Software for Recurring Contracts",
    description: "Build polished office cleaning proposals with clear service frequencies for workspaces, restrooms, break rooms, lobbies, and shared areas.",
    challenges: ["Different cleaning needs across office zones", "Unclear consumable and supply responsibilities", "After-hours access and security requirements", "Periodic services hidden inside the monthly price"],
    scope: ["Workstations and private offices", "Conference rooms and reception", "Break rooms and restrooms", "Carpet, hard floors, glass, and high-touch points"],
    outcomes: ["Make recurring service easy to approve", "Show exactly what happens at each frequency", "Present upgrades without confusing the base scope"],
  },
  {
    slug: "medical-office-cleaning-proposals",
    audience: "Medical office cleaning providers",
    title: "Medical Office Cleaning Proposal Software",
    description: "Create detailed proposals for medical and dental offices while keeping facility-specific procedures, frequencies, and exclusions visible to the buyer.",
    challenges: ["Higher expectations for touchpoints and restrooms", "Facility-specific access and disposal procedures", "Different requirements for clinical and non-clinical areas", "Risk of promising services outside the agreed scope"],
    scope: ["Waiting, reception, and administrative areas", "Exam-room tasks approved by the facility", "Restrooms and high-touch surfaces", "Explicit exclusions and client responsibilities"],
    outcomes: ["Separate general cleaning from specialized services", "Make responsibilities easier to review", "Create a consistent proposal for each location"],
  },
  {
    slug: "post-construction-cleaning-proposals",
    audience: "Post-construction cleaners",
    title: "Post-Construction Cleaning Proposal Software",
    description: "Define phases, areas, assumptions, and optional work in a professional post-construction cleaning proposal.",
    challenges: ["Scope changes as trades finish", "Debris and surface conditions vary widely", "One-time work is difficult to price from old templates", "Change orders are missed when assumptions are vague"],
    scope: ["Rough, final, and touch-up phases", "Interior glass and surface detailing", "Floor-specific cleaning", "Access, utilities, debris, and schedule assumptions"],
    outcomes: ["Clarify what each cleaning phase includes", "Keep allowances and exclusions visible", "Create a stronger basis for change requests"],
  },
  {
    slug: "warehouse-cleaning-proposals",
    audience: "Industrial and warehouse cleaners",
    title: "Warehouse Cleaning Proposal Software",
    description: "Build a structured warehouse cleaning proposal covering offices, restrooms, production-adjacent spaces, large floors, and access constraints.",
    challenges: ["Large areas with very different production rates", "Equipment, safety, and access requirements", "Cleaning windows shaped by operations", "Office and warehouse work blended into one vague price"],
    scope: ["Administrative and employee areas", "Restrooms, locker rooms, and break areas", "Open floor and designated operational zones", "Equipment, access, frequency, and exclusions"],
    outcomes: ["Separate high-detail and open-area work", "Record operational constraints before pricing", "Give stakeholders a readable facility-wide scope"],
  },
];

export const SOLUTION_SLUGS = SOLUTIONS.map((solution) => solution.slug);
export const getSolution = (slug: string) => SOLUTIONS.find((solution) => solution.slug === slug);
