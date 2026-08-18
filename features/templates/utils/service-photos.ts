// Photo pools and the deterministic picker, kept apart from the scope-of-work
// derivation in `resolve-template-images` (which imports the scope-templates
// constants at runtime). Deliberately dependency-free — the only import here is
// a type, erased at build — so client bundles like the public /demo-proposal
// page can pick photos without dragging that in.
import type { TemplateImages } from '../types/templates';

const COMMERCIAL_DIR = '/images/templates/commercial';
const RESIDENTIAL_DIR = '/images/templates/residential';

/** Photo pools for one service type, split by the slot a filename is meant for. */
interface ServicePhotoPools {
  /** Cover slots (`coverImage` / `coverMask`) — the `*-cover-*` files. */
  covers: string[];
  /** TOC, about and qualifications — plus thank-you when `closing` is empty. */
  general: string[];
  /** Closing / thank-you page. Falls back to `general` when empty. */
  closing: string[];
}

/**
 * Photographs available per service type.
 *
 * `carpet`, `window` and `floor` are deliberately absent: with no folder of
 * their own they fall through to SCOPE_IMAGE_SETS and the stock art, which is
 * today's behaviour. Adding one later is a data-only change to this map.
 */
const SERVICE_PHOTO_POOLS: Record<string, ServicePhotoPools> = {
  commercial: {
    covers: [
      `${COMMERCIAL_DIR}/C01-cover-green-reception.png`,
      `${COMMERCIAL_DIR}/C02-cover-blue-reception.png`,
    ],
    general: [
      `${COMMERCIAL_DIR}/C03-glass-cleaning.png`,
      `${COMMERCIAL_DIR}/C04-office-vacuuming.png`,
      `${COMMERCIAL_DIR}/C05-floor-care.png`,
      `${COMMERCIAL_DIR}/C06-atrium.png`,
      `${COMMERCIAL_DIR}/C07-conference-city.png`,
      `${COMMERCIAL_DIR}/C08-glass-corridor.png`,
      `${COMMERCIAL_DIR}/C09-collaboration-area.png`,
      `${COMMERCIAL_DIR}/C10-executive-lobby.png`,
    ],
    // No closing-specific commercial photo; thank-you draws from `general`.
    closing: [],
  },
  residential: {
    covers: [
      `${RESIDENTIAL_DIR}/R01-cover-warm-living.png`,
      `${RESIDENTIAL_DIR}/R02-cover-bright-living.png`,
    ],
    general: [
      `${RESIDENTIAL_DIR}/R03-general-cleaner.png`,
      `${RESIDENTIAL_DIR}/R04-kitchen-cleaning.png`,
      `${RESIDENTIAL_DIR}/R05-sofa-vacuuming.png`,
      `${RESIDENTIAL_DIR}/R06-kitchen-white.png`,
      `${RESIDENTIAL_DIR}/R07-kitchen-warm.png`,
      `${RESIDENTIAL_DIR}/R08-bathroom-glass-shower.png`,
      `${RESIDENTIAL_DIR}/R09-bathroom-neutral.png`,
    ],
    closing: [`${RESIDENTIAL_DIR}/R10-closing-armchair.png`],
  },
};

/** FNV-1a 32-bit. Small, dependency-free, and good enough to spread UUIDs. */
function hashSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * `count` entries from `pool`, starting at a seeded offset and wrapping.
 *
 * Rotation rather than a shuffle: it is the cheapest way to guarantee no photo
 * repeats inside one proposal (while `count <= pool.length`) and it stays
 * trivial to reason about.
 */
function rotate(pool: string[], seed: number, count: number): string[] {
  const start = seed % pool.length;
  return Array.from(
    { length: count },
    (_, i) => pool[(start + i) % pool.length]
  );
}

/** The proposal fields the photo pick depends on. */
export interface ServicePhotoSource {
  id?: string | null;
  title?: string | null;
  service_type?: string | null;
}

/**
 * Photographs for a proposal drawn from its service type's folder, or
 * `undefined` when that service type has no folder yet.
 *
 * The pick is a pure hash of the proposal id, never `Math.random()`. This
 * module runs twice per proposal in two separate processes — once for the
 * on-screen preview (TemplateRenderer) and once inside the headless browser
 * that prints the PDF (PrintTemplateSwitcher) — so anything non-deterministic
 * would hand the client a PDF that does not match the preview they approved.
 * Seeding only on the id (never on the template type) also keeps the two paths
 * in agreement even though they derive TemplateType differently.
 *
 * The demo relies on the title fallback: its mock proposals all carry
 * `id: ""`, so each demo package's distinct title is what separates their art.
 */
export function resolveServicePhotos(
  proposal: ServicePhotoSource
): TemplateImages | undefined {
  const pools = SERVICE_PHOTO_POOLS[proposal.service_type ?? ''];
  if (!pools) return undefined;

  // Title fallback keeps unsaved/preview proposals off index 0 every time.
  const key = proposal.id || proposal.title || '';
  const cover = rotate(pools.covers, hashSeed(`${key}:cover`), 1)[0];
  const [tocImage, aboutImage, qualificationsImage, generalClosing] = rotate(
    pools.general,
    hashSeed(`${key}:general`),
    4
  );

  return {
    // No template renders both, so the same photo can serve either cover slot.
    coverImage: cover,
    coverMask: cover,
    tocImage,
    aboutImage,
    qualificationsImage,
    thankYouImage: pools.closing.length
      ? rotate(pools.closing, hashSeed(`${key}:closing`), 1)[0]
      : generalClosing,
  };
}
