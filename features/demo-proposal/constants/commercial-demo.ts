import type { DemoCardConfig, DemoProposalData } from "../types/demo-proposal";

export const COMMERCIAL_DEMO_CARD: DemoCardConfig = {
  type: "commercial",
  title: "Commercial Janitorial",
  subtitle: "Recurring office cleaning proposal",
  badge: "Most popular for B2B",
};

export const COMMERCIAL_DEMO_DATA: DemoProposalData = {
  type: "commercial",
  clientName: "Evergreen Professional Offices",
  propertyType: "Commercial Office",
  city: "Seattle, WA",
  estimatedSize: "12,000 sq. ft.",
  serviceType: "Recurring Janitorial",
  cleaningFrequency: "5x weekly",
  restrooms: 4,
  breakrooms: 1,
  samplePriceRange: "$2,850 – $3,400/month",
  scopeTemplateName: "Standard Office Janitorial",
  scopeTemplateId: "commercial_office",
  defaultQuickInputs: {
    serviceType: "commercial",
    propertyType: "Commercial Office",
    squareFootage: 12000,
    frequency: "5x-week",
    location: "Seattle, WA",
    restrooms: 4,
    breakrooms: 1,
  },
  sections: [
    {
      id: "cover",
      title: "Cover / Introduction",
      content:
        "Thank you for the opportunity to present this janitorial services proposal for Evergreen Professional Offices. Veltex Demo Cleaning Co. specializes in professional commercial cleaning programs designed for multi-tenant office environments. Our team delivers consistent, measurable results through trained crews, documented quality checks, and responsive account management.",
      highlight:
        "Prepared for Evergreen Professional Offices · Seattle, WA · Recurring Janitorial · 5x weekly",
    },
    {
      id: "client-summary",
      title: "Client / Property Summary",
      content:
        "The following summary reflects the property details used to scope this proposal. Our recommended program is tailored to a 12,000 sq. ft. commercial office with daily traffic patterns typical of professional workplaces in the Seattle metro area.",
      bullets: [
        "Client: Evergreen Professional Offices",
        "Property type: Commercial Office",
        "Location: Seattle, WA",
        "Estimated size: 12,000 sq. ft.",
        "Service type: Recurring Janitorial",
        "Cleaning frequency: 5x weekly (Monday–Friday)",
        "Restrooms: 4",
        "Breakrooms: 1",
        "Scope template: Standard Office Janitorial",
      ],
    },
    {
      id: "schedule",
      title: "Recommended Cleaning Schedule",
      content:
        "We recommend after-hours service Monday through Friday to minimize disruption to tenants and visitors. High-touch surfaces in lobbies and restrooms receive additional attention on each visit, with a deeper focus rotation on Fridays ahead of the weekend.",
      bullets: [
        "Monday–Friday: Full janitorial service after business hours",
        "Daily: Restroom sanitization, trash removal, and common area touchpoints",
        "Weekly: Breakroom deep clean, glass spot cleaning, and floor care rotation",
        "Monthly: High dusting, vent covers, and detailed baseboard wipe-down",
        "On-call: Spill response and special request handling within 24 hours",
      ],
      highlight:
        "Schedule designed for minimal tenant disruption with consistent weekday coverage.",
    },
    {
      id: "scope",
      title: "Scope of Work",
      content:
        "This proposal covers routine janitorial maintenance for all contracted areas within Evergreen Professional Offices. Services include labor, supervision, equipment, and EPA-registered cleaning products. Customer-supplied consumables such as paper towels, tissue, hand soap, and trash liners are excluded unless otherwise noted.",
      bullets: [
        "Offices, workstations, and conference rooms",
        "Common areas, corridors, and lobby",
        "4 restrooms and 1 breakroom",
        "Elevator lobbies and interior glass (spot cleaning)",
        "Trash and recycling collection from designated points",
        "Hard floor maintenance and carpet vacuuming in traffic lanes",
      ],
    },
    {
      id: "restrooms",
      title: "Restroom Cleaning",
      content:
        "All four restrooms receive a standardized sanitization protocol on each service visit. Our crews follow a top-to-bottom cleaning sequence with color-coded microfiber systems to prevent cross-contamination.",
      bullets: [
        "Disinfect toilets, urinals, sinks, and fixtures",
        "Clean and polish mirrors and chrome surfaces",
        "Restock paper products and soap when supplies are provided on-site",
        "Empty trash and replace liners",
        "Mop and disinfect floors with neutral cleaner",
        "Wipe partitions, stall doors, and high-touch handles",
      ],
    },
    {
      id: "breakroom",
      title: "Breakroom Cleaning",
      content:
        "The tenant breakroom is cleaned daily with a focused deep-clean rotation each week. Food-contact surfaces receive additional sanitization to support a safe, welcoming space for staff.",
      bullets: [
        "Clean and sanitize countertops, tables, and appliance exteriors",
        "Wipe microwave, refrigerator handles, and vending touchpoints",
        "Empty trash and recycling; replace liners",
        "Sweep and mop floors; spot-treat spills",
        "Weekly: Interior microwave wipe-down and refrigerator exterior detail",
      ],
    },
    {
      id: "office-common",
      title: "Office and Common Area Cleaning",
      content:
        "Office suites and shared common areas are maintained to a consistent professional standard. Workstations are tidied and sanitized at touchpoints without disturbing personal items or confidential materials.",
      bullets: [
        "Dust and wipe desks, credenzas, and reachable surfaces",
        "Vacuum carpeted offices and traffic lanes",
        "Empty individual and common waste containers",
        "Clean interior glass on doors and partition panels (spot cleaning)",
        "Maintain lobby appearance including entry mats and reception surfaces",
        "Conference rooms reset after use: tables, chairs, and whiteboards",
      ],
    },
    {
      id: "trash",
      title: "Trash and Recycling",
      content:
        "Trash and recycling are collected from all designated collection points and transported to the building's central waste area per property management guidelines.",
      bullets: [
        "Empty all office, restroom, and breakroom waste containers",
        "Replace liners in all serviced receptacles",
        "Collect recycling from marked bins; sort per building program",
        "Wipe exterior of bins as needed to maintain appearance",
        "Report overflow or contamination issues to the site contact",
      ],
    },
    {
      id: "floor-care",
      title: "Floor Care Notes",
      content:
        "Floor care is matched to the surface types present in a Class A office environment. Routine maintenance preserves appearance between periodic restoration services.",
      bullets: [
        "Carpet: Vacuum all traffic lanes and office areas each visit",
        "Hard floors: Dust mop and damp mop with neutral cleaner",
        "Entry mats: Vacuum and shake out; periodic extraction as scheduled",
        "Spill response: Immediate treatment of visible spots in traffic areas",
        "Quarterly recommendation: Machine scrub hard floors in main corridors",
      ],
      highlight:
        "Periodic floor restoration (strip/wax, carpet extraction) available as add-on services.",
    },
    {
      id: "addons",
      title: "Optional Add-Ons",
      content:
        "The following services can be added to your janitorial program based on seasonal needs, move-in/move-out events, or property management requirements.",
      bullets: [
        "Carpet hot-water extraction",
        "Interior window cleaning (full pane)",
        "Post-construction / turnover clean",
        "Day porter coverage during business hours",
        "Consumable restocking program",
        "ULV disinfection fogging for flu season",
      ],
    },
    {
      id: "pricing",
      title: "Sample Pricing Range",
      content:
        "The following range is based on facility size, service frequency, restroom count, and scope template. Final pricing is confirmed after a brief walkthrough and scope review.",
      highlight: "Sample monthly investment: $2,850 – $3,400/month",
      bullets: [
        "Includes 5x weekly janitorial service",
        "Covers all areas listed in scope of work",
        "Pricing valid for 30 days from proposal date",
        "Annual agreement with 30-day termination notice",
        "Adjustments available if frequency or coverage changes",
      ],
    },
    {
      id: "next-steps",
      title: "Next Steps",
      content:
        "We would welcome the opportunity to walk the property, confirm scope details, and finalize a service start date that works for your team and tenants.",
      bullets: [
        "Schedule a brief site walkthrough (15–20 minutes)",
        "Confirm scope, schedule, and access procedures",
        "Execute service agreement and set start date",
        "Assign dedicated account manager and crew lead",
        "Conduct initial quality inspection within the first two weeks",
      ],
      highlight:
        "Reply to this proposal or contact us to schedule your walkthrough.",
    },
  ],
};
