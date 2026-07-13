import type { DemoCardConfig, DemoProposalData } from "../types/demo-proposal";

export const RESIDENTIAL_DEMO_CARD: DemoCardConfig = {
  type: "residential",
  title: "Residential Cleaning",
  subtitle: "Deep clean + optional recurring maintenance",
  badge: "Great for homeowners",
};

export const RESIDENTIAL_DEMO_DATA: DemoProposalData = {
  type: "residential",
  clientName: "Maple Ridge Residence",
  propertyType: "Residential Home",
  city: "Tacoma, WA",
  estimatedSize: "2,800 sq. ft.",
  serviceType: "Residential Deep Cleaning",
  cleaningFrequency:
    "One-time deep clean with optional recurring maintenance",
  bedrooms: 4,
  bathrooms: 3,
  samplePriceRange: "$525 – $750",
  scopeTemplateName: "Residential Deep Clean",
  scopeTemplateId: "move_out_turnover",
  defaultQuickInputs: {
    serviceType: "residential",
    propertyType: "Move-Out/Turnover",
    squareFootage: 2800,
    frequency: "one-time",
    location: "Tacoma, WA",
    bedrooms: 4,
    bathrooms: 3,
  },
  sections: [
    {
      id: "cover",
      title: "Cover / Introduction",
      content:
        "Thank you for considering Veltex Demo Cleaning Co. for your home. This proposal outlines a comprehensive deep cleaning plan for Maple Ridge Residence in Tacoma, WA. Our residential team uses detailed checklists, eco-conscious products upon request, and a satisfaction-focused approach so your home feels refreshed, healthy, and ready to enjoy.",
      highlight:
        "Prepared for Maple Ridge Residence · Tacoma, WA · Residential Deep Clean",
    },
    {
      id: "home-summary",
      title: "Home / Property Summary",
      content:
        "This deep clean is scoped for a 2,800 sq. ft. home with four bedrooms and three bathrooms. The plan below addresses high-traffic areas, built-up grime, and detail work that routine cleaning may miss.",
      bullets: [
        "Client: Maple Ridge Residence",
        "Property type: Residential Home",
        "Location: Tacoma, WA",
        "Estimated size: 2,800 sq. ft.",
        "Bedrooms: 4",
        "Bathrooms: 3",
        "Service type: Residential Deep Cleaning",
        "Frequency: One-time deep clean with optional recurring maintenance",
        "Scope template: Residential Deep Clean",
      ],
    },
    {
      id: "cleaning-plan",
      title: "Recommended Cleaning Plan",
      content:
        "We recommend a one-time deep clean to reset the home to a high baseline, followed by optional bi-weekly or monthly maintenance to keep it there. The initial visit typically requires 6–8 crew hours depending on condition and access.",
      bullets: [
        "Visit 1: Full deep clean per scope below (one-time)",
        "Optional: Bi-weekly maintenance clean (kitchen, baths, floors, dusting)",
        "Optional: Monthly detail rotation (baseboards, vents, interior glass)",
        "Products: Standard professional-grade; green options available on request",
        "Satisfaction: Re-clean of any missed area reported within 24 hours",
      ],
      highlight:
        "Deep clean first — then maintain with a lighter recurring program if desired.",
    },
    {
      id: "kitchen",
      title: "Kitchen Deep Cleaning",
      content:
        "The kitchen receives focused degreasing and sanitization. We work around small appliances left on counters and ask that the sink be clear of dishes before our arrival.",
      bullets: [
        "Degrease and wipe all countertops and backsplash",
        "Clean exterior of appliances: refrigerator, oven, microwave, dishwasher",
        "Scrub sink, faucet, and drain area",
        "Wipe cabinet faces and drawer fronts",
        "Clean stovetop, burners, and control panels",
        "Sweep and mop floors; detail along baseboards",
      ],
    },
    {
      id: "bathrooms",
      title: "Bathroom Deep Cleaning",
      content:
        "All three bathrooms are deep cleaned using a room-by-room protocol. We remove soap scum, hard-water buildup, and grime from corners and fixtures.",
      bullets: [
        "Scrub and disinfect toilets, showers, tubs, and sinks",
        "Remove soap scum and water spots from glass and tile",
        "Clean mirrors, fixtures, and chrome to a polish",
        "Wipe vanity cabinets and countertops",
        "Empty trash and replace liners",
        "Mop floors and detail grout lines where accessible",
      ],
    },
    {
      id: "bedrooms",
      title: "Bedroom Cleaning",
      content:
        "Each of the four bedrooms is cleaned with attention to dust accumulation, floors, and touchpoints. Beds are made only if linens are left neatly placed for our crew.",
      bullets: [
        "Dust furniture, nightstands, dressers, and reachable surfaces",
        "Wipe light switches, door handles, and baseboards",
        "Vacuum carpets or sweep and mop hard floors",
        "Clean interior window sills and tracks (accessible)",
        "Empty waste baskets and replace liners",
        "Mirror and glass spot cleaning",
      ],
    },
    {
      id: "living-areas",
      title: "Living Areas / Common Areas",
      content:
        "Living room, family room, dining area, hallways, and staircases are detailed to remove dust and refresh high-traffic zones where families gather most.",
      bullets: [
        "Dust entertainment centers, shelving, and décor (reachable items)",
        "Vacuum upholstery crevices and under cushions (if accessible)",
        "Clean coffee tables, side tables, and dining surfaces",
        "Vacuum stairs, landings, and hallway carpets",
        "Wipe handrails, switch plates, and door frames",
        "Spot-clean walls and switch plates for smudges",
      ],
    },
    {
      id: "dusting",
      title: "Dusting and High-Touch Surfaces",
      content:
        "Deep cleaning includes attention to surfaces that accumulate allergens and fingerprints between routine cleans.",
      bullets: [
        "High dusting: ceiling fan blades, crown molding (reachable)",
        "Wipe all high-touch points: knobs, remotes area, handrails",
        "Dust blinds, vent covers, and window ledges",
        "Clean interior glass on main living area windows (reachable)",
        "Detail door frames, tops of doors, and closet ledges",
      ],
    },
    {
      id: "floor-care",
      title: "Floor Care",
      content:
        "Floors throughout the home are vacuumed, swept, and mopped according to surface type. We use appropriate products for hardwood, tile, and carpet.",
      bullets: [
        "Vacuum all carpeted bedrooms and living areas",
        "Sweep and damp mop hard floors in kitchen, baths, and entries",
        "Edge vacuum along baseboards in main traffic paths",
        "Spot-treat visible carpet stains (non-set stains)",
        "Entry mats shaken out or vacuumed",
      ],
      highlight:
        "Carpet steam cleaning and hardwood conditioning available as add-ons.",
    },
    {
      id: "addons",
      title: "Optional Add-Ons",
      content:
        "Enhance your deep clean or maintenance plan with these popular residential services.",
      bullets: [
        "Inside oven and refrigerator cleaning",
        "Interior window cleaning (full home)",
        "Garage sweep and organize (floor level)",
        "Laundry room and mudroom detail",
        "Move-in / move-out cleaning package",
        "Recurring bi-weekly or monthly maintenance plan",
      ],
    },
    {
      id: "pricing",
      title: "Sample Pricing Range",
      content:
        "Pricing reflects home size, number of bathrooms, initial condition, and access. A brief walkthrough or photo review confirms the final quote before your scheduled deep clean.",
      highlight: "Sample investment: $525 – $750 (one-time deep clean)",
      bullets: [
        "Includes full deep clean per scope above",
        "Typical visit: 6–8 crew hours for homes of this size",
        "Quote valid for 30 days",
        "Recurring maintenance priced separately if desired",
        "Eco-friendly product upgrade available at no extra charge",
      ],
    },
    {
      id: "next-steps",
      title: "Next Steps",
      content:
        "We would love to help you get Maple Ridge Residence back to a fresh, comfortable baseline. Scheduling is flexible including weekday and Saturday options.",
      bullets: [
        "Confirm preferred date and estimated arrival window",
        "Complete a brief home access and pet notes checklist",
        "Receive confirmation with crew lead contact information",
        "Enjoy your deep clean — satisfaction follow-up within 24 hours",
        "Discuss optional recurring maintenance if interested",
      ],
      highlight:
        "Book your deep clean or ask questions — we respond within one business day.",
    },
  ],
};
