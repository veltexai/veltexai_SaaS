import { getDemoTemplateData } from "@/features/demo-proposal/utils/get-demo-template-data";
import type { ResidentialPackageType } from "@/features/demo-proposal/types/demo-proposal";
import type { TemplateImages } from "@/features/templates/types/templates";

const PACKAGES: ResidentialPackageType[] = [
  "recurring",
  "deep-clean",
  "move-in-out",
  "premium-detail",
];

/** Every image path in the set, minus the non-path `accentColor` slot. */
const photoPaths = (images: TemplateImages | undefined): string[] => {
  const { accentColor: _accentColor, ...photos } = images ?? {};
  return Object.values(photos).filter((src): src is string => Boolean(src));
};

describe("getDemoTemplateData images", () => {
  it("draws commercial photos from the commercial folder", () => {
    const { images } = getDemoTemplateData("commercial");

    expect(images).toBeDefined();
    const paths = photoPaths(images);
    expect(paths.length).toBeGreaterThan(0);
    for (const src of paths) {
      expect(src).toMatch(/^\/images\/templates\/commercial\//);
    }
  });

  it("leaves the commercial demo without an accent override", () => {
    expect(getDemoTemplateData("commercial").images?.accentColor).toBeUndefined();
  });

  it.each(PACKAGES)(
    "draws %s photos from the residential folder",
    (pkg) => {
      const { images } = getDemoTemplateData("residential", pkg);

      expect(images).toBeDefined();
      const paths = photoPaths(images);
      expect(paths.length).toBeGreaterThan(0);
      for (const src of paths) {
        expect(src).toMatch(/^\/images\/templates\/residential\//);
      }
    },
  );

  it.each(PACKAGES)("keeps the navy accent on %s", (pkg) => {
    expect(getDemoTemplateData("residential", pkg).images?.accentColor).toBe(
      "#001B7A",
    );
  });

  it("gives each residential package its own photo set", () => {
    const sets = PACKAGES.map((pkg) =>
      JSON.stringify(photoPaths(getDemoTemplateData("residential", pkg).images)),
    );
    expect(new Set(sets).size).toBe(PACKAGES.length);
  });

  it("defaults to the recurring package", () => {
    expect(getDemoTemplateData("residential").images).toEqual(
      getDemoTemplateData("residential", "recurring").images,
    );
  });

  it("is deterministic across calls", () => {
    expect(getDemoTemplateData("commercial").images).toEqual(
      getDemoTemplateData("commercial").images,
    );
    for (const pkg of PACKAGES) {
      expect(getDemoTemplateData("residential", pkg).images).toEqual(
        getDemoTemplateData("residential", pkg).images,
      );
    }
  });

  it("no longer serves the legacy pre-masked art", () => {
    const every = [
      photoPaths(getDemoTemplateData("commercial").images),
      ...PACKAGES.map((pkg) =>
        photoPaths(getDemoTemplateData("residential", pkg).images),
      ),
    ].flat();

    for (const src of every) {
      expect(src).not.toContain("/images/templates/Images/");
    }
  });
});
