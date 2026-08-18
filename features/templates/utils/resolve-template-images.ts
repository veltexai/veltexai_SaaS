// Imported deep rather than from `@/features/proposals/quick` on purpose: that
// barrel re-exports QuickProposalFlow ("use client"), and this module is pulled
// into server render paths (TemplateRenderer, the print route).
import {
  DEFAULT_SCOPE_TEMPLATE_ID,
  isScopeTemplateId,
  type ScopeTemplateId,
} from '@/features/proposals/quick/constants/scope-templates';
import type { Proposal, TemplateImages, TemplateType } from '../types/templates';
import { resolveServicePhotos } from './service-photos';

// Re-exported so this module stays the single entrypoint for template art.
// Import './service-photos' directly when you only need the photo pick and not
// the scope derivation below (as the demo does).
export { resolveServicePhotos } from './service-photos';
export type { ServicePhotoSource } from './service-photos';

const IMAGES_DIR = '/images/templates/Images';

/** Build a luxury_elite slot map from a `<prefix>_one..four` art set. */
function luxurySet(prefix: string): TemplateImages {
  return {
    coverMask: `${IMAGES_DIR}/${prefix}_one.png`,
    tocImage: `${IMAGES_DIR}/${prefix}_two.png`,
    aboutImage: `${IMAGES_DIR}/${prefix}_three.png`,
    qualificationsImage: `${IMAGES_DIR}/${prefix}_four.png`,
  };
}

/**
 * Legacy art keyed by scope of work, then by template family.
 *
 * Superseded by SERVICE_PHOTO_POOLS for `commercial` and `residential`
 * proposals; this map is only reached by the service types that have no photo
 * folder yet (`carpet`, `window`, `floor`).
 *
 * Only `luxury_elite` ever had bespoke art here: the `deep_cleaning_*`,
 * `move_in_out_*` and `premium_detail_*` PNGs are 1322x769 alpha-masked cutouts
 * pre-shaped to luxury_elite's slots, so they would render as floating shapes
 * in the rectangular photo slots of the other templates. Those families resolve
 * to `undefined` and fall through to their stock art.
 *
 * Note these cutouts predate the `.image-frame-*` clip-paths in app/globals.css,
 * which now do the shaping in CSS — so a cutout routed here gets clipped twice.
 * Retire this map once the remaining service types get photo folders.
 */
const SCOPE_IMAGE_SETS: Partial<
  Record<ScopeTemplateId, Partial<Record<TemplateType, TemplateImages>>>
> = {
  move_out_turnover: { luxury_elite: luxurySet('move_in_out') },
  apartment_common_areas: { luxury_elite: luxurySet('move_in_out') },
  post_construction: { luxury_elite: luxurySet('deep_cleaning') },
  restroom_breakroom_detail: { luxury_elite: luxurySet('deep_cleaning') },
  floor_care_add_on: { luxury_elite: luxurySet('premium_detail') },
  window_cleaning_add_on: { luxury_elite: luxurySet('premium_detail') },
};

/** Building types from `facilityDetailsSchema` mapped onto a scope of work. */
const BUILDING_TYPE_TO_SCOPE: Record<string, ScopeTemplateId> = {
  medical: 'medical_office',
  retail: 'retail',
  educational: 'school_daycare',
  daycare: 'school_daycare',
  apartment: 'apartment_common_areas',
  condo: 'apartment_common_areas',
  townhouse: 'apartment_common_areas',
  house: 'move_out_turnover',
  residential: 'move_out_turnover',
  office: 'commercial_office',
  warehouse: 'commercial_office',
  industrial: 'commercial_office',
  church: 'commercial_office',
  hospitality: 'commercial_office',
  restaurant: 'commercial_office',
};

const SERVICE_TYPE_TO_SCOPE: Record<string, ScopeTemplateId> = {
  window: 'window_cleaning_add_on',
  floor: 'floor_care_add_on',
  carpet: 'floor_care_add_on',
  residential: 'move_out_turnover',
  commercial: 'commercial_office',
};

function readRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

export interface ScopeTemplateIdSource {
  service_type?: string | null;
  service_specific_data?: unknown;
  facility_details?: unknown;
  property_type?: string | null;
}

/**
 * Resolve the scope of work a proposal represents.
 *
 * The quick flow persists `scope_template_id` directly; the advanced flow and
 * anything saved before that existed are derived from the service and building
 * type instead.
 */
export function deriveScopeTemplateId(
  source: ScopeTemplateIdSource
): ScopeTemplateId {
  const serviceSpecific = readRecord(source.service_specific_data);

  const persisted = serviceSpecific.scope_template_id;
  if (typeof persisted === 'string' && isScopeTemplateId(persisted)) {
    return persisted;
  }

  const buildingType = readRecord(source.facility_details).building_type;
  if (typeof buildingType === 'string') {
    const mapped = BUILDING_TYPE_TO_SCOPE[buildingType.toLowerCase()];
    if (mapped) return mapped;
  }

  const propertyType =
    (typeof serviceSpecific.property_type === 'string'
      ? serviceSpecific.property_type
      : null) ?? source.property_type;
  if (typeof propertyType === 'string') {
    const mapped = BUILDING_TYPE_TO_SCOPE[propertyType.trim().toLowerCase()];
    if (mapped) return mapped;
  }

  if (source.service_type) {
    const mapped = SERVICE_TYPE_TO_SCOPE[source.service_type];
    if (mapped) return mapped;
  }

  return DEFAULT_SCOPE_TEMPLATE_ID;
}

/**
 * Image overrides for a proposal, or `undefined` when no bespoke art exists for
 * it (in which case the template renders stock art).
 *
 * Service-type photographs win over the legacy scope art: they are plain
 * rectangles that the `.image-frame-*` clip-paths shape correctly, whereas the
 * scope cutouts are pre-masked and would be clipped twice.
 */
export function resolveTemplateImages(
  proposal: Proposal,
  templateType: TemplateType
): TemplateImages | undefined {
  const servicePhotos = resolveServicePhotos(proposal);
  if (servicePhotos) return servicePhotos;

  const scopeTemplateId = deriveScopeTemplateId(proposal);
  return SCOPE_IMAGE_SETS[scopeTemplateId]?.[templateType];
}
