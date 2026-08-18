import type {
  Proposal,
  Branding,
  TemplateImages,
} from "@/features/templates/types/templates";
// The photo picker only — not `resolve-template-images`, which also carries the
// scope-of-work derivation this file has no use for.
import { resolveServicePhotos } from "@/features/templates/utils/service-photos";
import type { DemoType, ResidentialPackageType } from "../types/demo-proposal";

const DEMO_BRANDING: Branding = {
  name: "Veltex Demo Cleaning Co.",
  logo_url: "/images/veltex-mock-logo.png",
  phone: "(555) 000-0000",
  website: "www.veltexdemo.com",
  email: "hello@veltexdemo.com",
};

function makeMockProposal(
  overrides: Partial<Proposal> & { title: string; client_name: string },
): Proposal {
  const now = new Date().toISOString();
  return {
    id: "", // empty string → useSplitContent guard returns early, no fetch
    user_id: "demo",
    client_email: "demo@example.com",
    contact_phone: "(555) 000-0000",
    facility_size: 0,
    service_type: "commercial",
    service_frequency: "one-time",
    service_specific_data: {},
    global_inputs: {},
    pricing_enabled: false,
    pricing_data: {},
    generated_content: null,
    status: "draft",
    facility_details: {},
    traffic_analysis: {},
    service_scope: {},
    special_requirements: {},
    regional_location: null,
    city: null,
    property_type: null,
    pricing_breakdown: {},
    ai_tone: null,
    view_count: 0,
    last_viewed_at: null,
    tracking_enabled: false,
    send_options: null,
    template_id: null,
    created_at: now,
    updated_at: now,
    client_company: null,
    service_location: "",
    ...overrides,
  };
}

// ─── Commercial ──────────────────────────────────────────────────────────────

const COMMERCIAL_PAGES: string[] = [
  // [0] About Our Company
  `Veltex Demo Cleaning Co. is a certified commercial janitorial provider with over a decade of service excellence in the Pacific Northwest. We design custom maintenance programs for professional office environments and multi-tenant buildings.
- Fully bonded and insured – general liability and workers' compensation
- Trained and background-verified cleaning staff
- Documented quality checklists delivered per service visit
- Dedicated account manager assigned to every contract`,

  // [1] Our Commitment
  `We are committed to delivering a consistent, professionally managed janitorial experience. Our internal quality control process includes documented pre/post-service checklists and responsive communication with your facilities team.
- Guaranteed re-service within 24 hours for any missed item
- Monthly site walkthrough with account manager
- Real-time communication via your preferred channel
- Supply-chain continuity plan to prevent service gaps`,

  // [2] Why Choose Us
  `Our clients choose Veltex Demo Cleaning Co. for one reason: we do what we say, every visit. Consistent crews, transparent reporting, and a team that treats your space like our own.
- Consistent crew rotation to build familiarity with your site
- Supply and equipment always provided by our team
- Green cleaning products available at no additional cost
- Competitive pricing backed by a 30-day service guarantee`,

  // [3] Scope of Service
  `Full janitorial maintenance for Evergreen Professional Offices – 12,000 sq. ft. commercial office, Seattle, WA. 5x weekly service Monday through Friday after business hours.

\`\`\`veliz_scope_table
{"rows":[{"area":"Offices & Workstations","frequency":"5x weekly","note":"Dust, sanitize surfaces, vacuum"},{"area":"Restrooms (4)","frequency":"5x weekly","note":"Full sanitization, restock supplies"},{"area":"Breakroom","frequency":"5x weekly","note":"Deep clean each Friday"},{"area":"Lobby & Common Areas","frequency":"5x weekly","note":"Glass, floors, reception"},{"area":"Corridors & Hallways","frequency":"5x weekly","note":"Vacuum carpets, mop hard floors"},{"area":"Trash & Recycling","frequency":"5x weekly","note":"All stations, replace liners"},{"area":"Hard Floor Care","frequency":"Weekly rotation","note":"Dust mop, damp mop, neutral cleaner"},{"area":"High Dusting","frequency":"Monthly","note":"Vents, ledges, ceiling fans"}]}
\`\`\``,

  // [4] Add-ons
  `The following services are available to complement your janitorial program based on seasonal needs or property requirements.
- Carpet hot-water extraction – quarterly or on-demand
- Interior window cleaning – full pane per floor
- Day porter coverage – business hours, high-traffic zones
- Post-event or move-in/move-out cleaning
- ULV disinfection fogging – flu season or post-illness response`,

  // [5] Service Quote & Pricing
  `\`\`\`veliz_pricing_table
{"rows":[{"service":"Recurring Janitorial – 5x Weekly","frequency":"5x-week","pricePerMonth":"$3,100"},{"service":"Supplies & Equipment","frequency":"monthly","pricePerMonth":"Included"}],"summary":{"subtotal":"$3,100.00","tax":"$0.00","total":"$3,100.00"}}
\`\`\``,

  // [6] Notes (empty)
  "",
];

const COMMERCIAL_PROPOSAL = makeMockProposal({
  title: "Janitorial Services Proposal",
  client_name: "Evergreen Professional Offices",
  client_company: "Evergreen Professional Offices",
  service_location: "1200 Market St",
  city: "Seattle, WA",
  facility_size: 12000,
  service_type: "commercial",
  service_frequency: "5x-week",
  property_type: "Commercial Office",
});

// ─── Residential: Recurring Cleaning ─────────────────────────────────────────

const RECURRING_PAGES: string[] = [
  `Veltex Demo Cleaning Co. brings dedicated residential cleaning crews who understand the unique care your home deserves. Our recurring maintenance clients receive assigned teams, consistent routines, and a satisfaction guarantee on every visit.
- Background-verified residential cleaning specialists
- Consistent crew assignment with your preferred team
- Eco-friendly products available at no additional cost
- Satisfaction guarantee – we re-clean any area within 48 hours`,

  `We believe every home deserves the same level of attention on visit 100 as it received on visit 1. Our commitment to recurring clients means detailed checklists, scheduled rotations, and a single point of contact for any service requests.
- Flexible scheduling including Saturday appointments
- 48-hour notice for rescheduling with no penalty
- Annual deep clean included with bi-weekly contracts
- Direct communication with your assigned team lead`,

  `Homeowners choose our recurring cleaning service because we eliminate the inconsistency of switching cleaners. You get the same team, the same routine, and a home that stays ahead of the build-up.
- No more reteaching your preferences to a new crew
- Checklist-based service with optional client notes
- Insurance coverage for all on-site crew members
- Easy pause or cancel with 30-day written notice`,

  `Bi-weekly maintenance for Henderson Residence – 2,400 sq. ft. home with 3 bedrooms and 2 bathrooms, Bellevue, WA.

\`\`\`veliz_scope_table
{"rows":[{"area":"Kitchen","frequency":"Every visit","note":"Counters, sink, appliance exteriors, floors"},{"area":"Bathrooms (2)","frequency":"Every visit","note":"Scrub, sanitize, polish fixtures"},{"area":"Master Bedroom","frequency":"Every visit","note":"Dust, vacuum, make bed if linens set"},{"area":"Bedrooms 2 & 3","frequency":"Every visit","note":"Dust, vacuum, straighten"},{"area":"Living & Dining","frequency":"Every visit","note":"Dust, vacuum, wipe all surfaces"},{"area":"Hallways & Stairs","frequency":"Every visit","note":"Vacuum, mop, wipe railings"},{"area":"Hard Floors","frequency":"Every visit","note":"Sweep and damp mop all areas"},{"area":"High Dusting","frequency":"Monthly rotation","note":"Fans, vents, window ledges"}]}
\`\`\``,

  `Popular upgrades for recurring maintenance clients.
- Inside oven and refrigerator cleaning – monthly add-on
- Interior window cleaning – seasonal or on-demand
- Garage floor sweep and light organize
- Laundry room and mudroom detail
- Post-party or event clean-up service`,

  `\`\`\`veliz_pricing_table
{"rows":[{"service":"Bi-Weekly Residential Cleaning – 3 Bed / 2 Bath","frequency":"bi-weekly","pricePerMonth":"$440"},{"service":"Eco-Friendly Product Upgrade","frequency":"monthly","pricePerMonth":"Included"}],"summary":{"subtotal":"$440.00","tax":"$0.00","total":"$440.00"}}
\`\`\``,

  "",
];

const RECURRING_PROPOSAL = makeMockProposal({
  title: "Recurring Cleaning Proposal",
  client_name: "Henderson Residence",
  client_company: "Henderson Residence",
  service_location: "48 Lakeview Dr",
  city: "Bellevue, WA",
  facility_size: 2400,
  service_type: "residential",
  service_frequency: "bi-weekly",
  property_type: "Residential Home",
});

// ─── Residential: Deep Cleaning ───────────────────────────────────────────────

const DEEP_CLEAN_PAGES: string[] = [
  `Veltex Demo Cleaning Co. deep cleaning teams specialize in comprehensive home resets that tackle months of accumulation in a single visit. Our crews are equipped with professional tools, degreasers, and detailed room-by-room checklists to restore your home to its best condition.
- Deep cleaning checklist per home
- Washington service area
- 6–8 crew hours standard for homes in this size range
- 100% Satisfaction Guarantee`,

  `Our deep cleaning commitment means every corner, baseboard, and fixture receives attention. We don't consider the visit complete until our team lead completes a room-by-room walkthrough.
- Crew lead walkthrough before leaving your home
- Photographic documentation of high-concern areas
- 24-hour re-clean guarantee for any reported missed area
- Full supply and equipment provided by our team`,

  `A deep clean from Veltex resets your home to a healthy, refreshed baseline that standard cleanings can then maintain going forward. Our clients consistently report the best deep clean they have ever experienced.
- Trained specifically in deep cleaning protocols, not just maintenance
- Color-coded microfiber system prevents cross-contamination
- Grout, glass, and fixture polishing included
- Optional green product upgrade at no additional cost`,

  `One-time comprehensive deep cleaning for Maple Ridge Residence – 2,800 sq. ft. home with 4 bedrooms and 3 bathrooms, Tacoma, WA.

\`\`\`veliz_scope_table
{"rows":[{"area":"Kitchen","frequency":"One-time","note":"Deep degrease counters, appliance exteriors, backsplash, floors"},{"area":"Bathrooms (3)","frequency":"One-time","note":"Scrub tile, remove soap scum, polish fixtures, detail grout"},{"area":"Bedrooms (4)","frequency":"One-time","note":"Dust all surfaces, vacuum, baseboards, window sills"},{"area":"Living & Dining","frequency":"One-time","note":"Dust décor, upholstery crevices, wipe all surfaces"},{"area":"Hallways & Stairs","frequency":"One-time","note":"Vacuum, mop, wipe handrails and door frames"},{"area":"Hard Floors","frequency":"One-time","note":"Sweep, mop, and edge along all baseboards"},{"area":"High Dusting","frequency":"One-time","note":"Ceiling fans, vents, crown molding (reachable)"},{"area":"Doors & Switch Plates","frequency":"One-time","note":"Wipe smudges, clean door tops and frames"}]}
\`\`\``,

  `Enhance your deep clean with these popular residential upgrades.
- Inside oven deep cleaning – degreaser and steam
- Interior refrigerator cleaning – shelves, drawers, door seals
- Interior window cleaning – full home, all reachable panes
- Garage floor sweep and light organize (ground level)
- Post-clean carpet spot treatment`,

  `\`\`\`veliz_pricing_table
{"rows":[{"service":"Residential Deep Cleaning – 4 Bed / 3 Bath","frequency":"one_time","pricePerMonth":"$640"},{"service":"Eco-Friendly Product Option","frequency":"one_time","pricePerMonth":"Included"}],"summary":{"subtotal":"$640.00","tax":"$0.00","total":"$640.00"}}
\`\`\``,

  "",
];

const DEEP_CLEAN_PROPOSAL = makeMockProposal({
  title: "Residential Deep Cleaning Proposal",
  client_name: "Maple Ridge Residence",
  client_company: "Maple Ridge Residence",
  service_location: "320 Maple Ridge Way",
  city: "Tacoma, WA",
  facility_size: 2800,
  service_type: "residential",
  service_frequency: "one-time",
  property_type: "Residential Home",
});

// ─── Residential: Move-In / Move-Out ─────────────────────────────────────────

const MOVE_IN_OUT_PAGES: string[] = [
  `Veltex Demo Cleaning Co. specializes in move-in and move-out cleaning services for homeowners, tenants, and property managers across the greater Seattle area. Our transition cleaning programs are designed to meet or exceed property management inspection standards.
- Move-out cleaning that maximizes deposit return potential
- Move-in cleaning for a fresh, sanitized start in your new home
- Available within 24–48 hours of booking confirmation
- Crew lead sign-off before departure with checklist documentation`,

  `We understand that move-in and move-out timelines are tight. Our team is trained to work efficiently and thoroughly under deadline pressure without cutting corners on quality.
- Guaranteed completion within scheduled service window
- Property manager–ready documentation available on request
- All supplies and equipment provided – no setup required by client
- Flexible AM or PM scheduling to fit your move timeline`,

  `Our move transition teams are trained specifically for vacant property cleaning. We know where inspectors look and what property managers expect – and we deliver consistently across every property we clean.
- Track record of successful deposit returns for tenants
- Experience with single-family homes, condos, and apartments
- Coordination with landlords or property managers on request
- Discounted recurring rate if you continue service in your new home`,

  `Move-in / move-out transition cleaning for Lakeview Property – 1,900 sq. ft. home with 3 bedrooms and 2 bathrooms, Kirkland, WA.

\`\`\`veliz_scope_table
{"rows":[{"area":"Kitchen – Full Detail","frequency":"One-time","note":"Inside oven, inside refrigerator, all cabinets & drawers"},{"area":"Bathrooms (2)","frequency":"One-time","note":"Sanitize all fixtures, tile, grout, mirrors, cabinets"},{"area":"Bedrooms (3)","frequency":"One-time","note":"Closets interior, window tracks, baseboards, walls spot-clean"},{"area":"Living & Dining","frequency":"One-time","note":"All surfaces, blinds, window sills, baseboards"},{"area":"Hallways & Stairs","frequency":"One-time","note":"Vacuum or sweep, mop, baseboards, switch plates"},{"area":"All Windows (interior)","frequency":"One-time","note":"Glass panes, tracks, and ledges"},{"area":"All Floors","frequency":"One-time","note":"Vacuum carpets, sweep and mop hard floors, edge detail"},{"area":"Garage (if applicable)","frequency":"One-time","note":"Sweep floor, wipe surfaces (ground level)"}]}
\`\`\``,

  `Add-on services frequently requested for move transition cleans.
- Professional carpet steam cleaning (per room)
- Exterior windows (ground-level panes)
- Storage room or utility closet clean-out
- Same-day emergency scheduling (subject to availability)`,

  `\`\`\`veliz_pricing_table
{"rows":[{"service":"Move-In / Move-Out Clean – 3 Bed / 2 Bath","frequency":"one_time","pricePerMonth":"$495"},{"service":"Interior Windows Included","frequency":"one_time","pricePerMonth":"Included"}],"summary":{"subtotal":"$495.00","tax":"$0.00","total":"$495.00"}}
\`\`\``,

  "",
];

const MOVE_IN_OUT_PROPOSAL = makeMockProposal({
  title: "Move-In / Move-Out Cleaning Proposal",
  client_name: "Lakeview Property",
  client_company: "Lakeview Property",
  service_location: "14 Lakeview Court",
  city: "Kirkland, WA",
  facility_size: 1900,
  service_type: "residential",
  service_frequency: "one-time",
  property_type: "Residential Home",
});

// ─── Residential: Premium Detail Cleaning ────────────────────────────────────

const PREMIUM_DETAIL_PAGES: string[] = [
  `Veltex Demo Cleaning Co. premium detail service is designed for discerning homeowners who expect perfection. Our detail-certified crews combine luxury cleaning techniques, white-glove protocols, and top-tier professional products to care for high-value homes and estate properties.
- White-glove trained, detail-certified residential crews
- Museum-quality care for artwork, antiques, and specialty surfaces
- Premium fragrance-free and hypoallergenic products available
- Dedicated client liaison for scheduling and special requests`,

  `Premium detail cleaning means nothing is overlooked. From the top of your cabinetry to the interior of your refrigerator drawers, every surface receives individual attention on a scheduled rotation.
- 120-point detail checklist with photographic documentation
- Dedicated crew team that learns and respects your home
- Special surface protocols for marble, hardwood, and fine finishes
- 48-hour priority re-service guarantee, no questions asked`,

  `Luxury home care requires a different standard. Our premium teams are selected for their attention to detail, their professionalism, and their ability to work discreetly in high-value residential environments.
- Selected, trained, and vetted for luxury home environments
- No detail is too small – trim, vents, hardware all polished
- Discrete, professional service with door-to-door key handling
- Trusted by estate managers and private households in Medina and Bellevue`,

  `Monthly premium detail cleaning for Whitmore Estate – 4,200 sq. ft. estate with 5 bedrooms and 4 bathrooms, Medina, WA.

\`\`\`veliz_scope_table
{"rows":[{"area":"Kitchen – White Glove Detail","frequency":"Monthly","note":"Interior appliances, polished hardware, cabinet interiors"},{"area":"Primary Suite","frequency":"Monthly","note":"Full detail, specialty surfaces, fine linens if set"},{"area":"Bathrooms (4)","frequency":"Monthly","note":"Mirror polish, chrome detail, marble or tile care"},{"area":"Bedrooms 2–5","frequency":"Monthly","note":"Full dusting, vacuuming, window treatments"},{"area":"Living & Formal Areas","frequency":"Monthly","note":"Artwork surfaces, décor, upholstery refresh"},{"area":"Dining Room","frequency":"Monthly","note":"Table polish, chairs, china cabinet exterior"},{"area":"Specialty Floor Care","frequency":"Monthly","note":"Hardwood conditioning, marble maintenance"},{"area":"High Detail Dusting","frequency":"Monthly","note":"Crown molding, light fixtures, top of all cabinetry"}]}
\`\`\``,

  `Luxury-grade add-on services for premium estate care.
- Silver and flatware polishing
- Exterior window cleaning – ground and upper floors
- Pool house or guest house service
- Pre-event preparation and post-event clean-down
- Wardrobe and closet organizational assistance`,

  `\`\`\`veliz_pricing_table
{"rows":[{"service":"Premium Monthly Detail – 5 Bed / 4 Bath Estate","frequency":"monthly","pricePerMonth":"$1,200"},{"service":"Specialty Surface Products","frequency":"monthly","pricePerMonth":"Included"},{"service":"Interior Appliances","frequency":"monthly","pricePerMonth":"Included"}],"summary":{"subtotal":"$1,200.00","tax":"$0.00","total":"$1,200.00"}}
\`\`\``,

  "",
];

const PREMIUM_DETAIL_PROPOSAL = makeMockProposal({
  title: "Premium Detail Cleaning Proposal",
  client_name: "Whitmore Estate",
  client_company: "Whitmore Estate",
  service_location: "9 Estates Blvd",
  city: "Medina, WA",
  facility_size: 4200,
  service_type: "residential",
  service_frequency: "1x-month",
  property_type: "Luxury Estate",
});

// ─── Demo images & accent color ───────────────────────────────────────────────

const RESIDENTIAL_ACCENT = "#001B7A";

/**
 * Photos for a demo proposal, drawn from the same service-type folders
 * production uses so the demo shows real output rather than a parallel set of
 * hardcoded art.
 *
 * `resolveServicePhotos` never sets `accentColor`, so the residential navy tint
 * has to be layered back on here — luxury_elite reads it into `--color-primary`.
 *
 * Every mock proposal carries `id: ""` (the demo-isolation guard), so the pick
 * seeds on `title` instead. The five titles are distinct, which is what gives
 * each package its own deterministic photo set with no extra plumbing.
 */
function getDemoImages(
  proposal: Proposal,
  accentColor?: string,
): TemplateImages | undefined {
  const photos = resolveServicePhotos(proposal);
  if (!photos) return accentColor ? { accentColor } : undefined;
  return accentColor ? { ...photos, accentColor } : photos;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface DemoTemplateData {
  proposal: Proposal;
  branding: Branding;
  pages: string[];
  images?: TemplateImages;
}

export function getDemoTemplateData(
  type: DemoType,
  residentialPackage?: ResidentialPackageType,
): DemoTemplateData {
  if (type === "commercial") {
    return {
      proposal: COMMERCIAL_PROPOSAL,
      branding: DEMO_BRANDING,
      pages: COMMERCIAL_PAGES,
      images: getDemoImages(COMMERCIAL_PROPOSAL),
    };
  }

  const pkg: ResidentialPackageType = residentialPackage ?? "recurring";

  const packageData = {
    "deep-clean": { proposal: DEEP_CLEAN_PROPOSAL, pages: DEEP_CLEAN_PAGES },
    "move-in-out": {
      proposal: MOVE_IN_OUT_PROPOSAL,
      pages: MOVE_IN_OUT_PAGES,
    },
    "premium-detail": {
      proposal: PREMIUM_DETAIL_PROPOSAL,
      pages: PREMIUM_DETAIL_PAGES,
    },
    recurring: { proposal: RECURRING_PROPOSAL, pages: RECURRING_PAGES },
  } satisfies Record<
    ResidentialPackageType,
    { proposal: Proposal; pages: string[] }
  >;

  const { proposal, pages } = packageData[pkg];

  return {
    proposal,
    branding: DEMO_BRANDING,
    pages,
    images: getDemoImages(proposal, RESIDENTIAL_ACCENT),
  };
}
