import { readFileSync } from "fs";
import { join } from "path";

const globalsSource = readFileSync(
  join(process.cwd(), "app/globals.css"),
  "utf8",
);
const luxuryTemplateSource = readFileSync(
  join(
    process.cwd(),
    "features/templates/components/luxury-elite.tsx",
  ),
  "utf8",
);

describe("Luxury Elite thank-you layout", () => {
  it("keeps the clipped image within its positioned container", () => {
    const imageFrame = globalsSource.match(/\.image-frame-5\s*\{([\s\S]*?)\}/);

    expect(imageFrame?.[1]).toContain("width: 100%;");
    expect(imageFrame?.[1]).toContain("height: 100%;");
    expect(imageFrame?.[1]).not.toContain("\u200a");
  });

  it("clips overflow at the page-ten boundary", () => {
    const pageTen = luxuryTemplateSource.match(
      /id="page-ten"[\s\S]*?className="([^"]+)"/,
    );

    expect(pageTen?.[1]).toContain("overflow-hidden");
  });
});
