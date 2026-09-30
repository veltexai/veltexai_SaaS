import fs from "node:fs";
import path from "node:path";

describe("proposal print layout contract", () => {
  const root = process.cwd();

  it("keeps cover titles readable and prevents page-size overflow", () => {
    const printPage = fs.readFileSync(
      path.join(root, "app/print/proposals/[id]/page.tsx"),
      "utf8"
    );
    const header = fs.readFileSync(
      path.join(
        root,
        "features/templates/components/shared/header-template.tsx"
      ),
      "utf8"
    );

    expect(header).toContain("proposal-title capitalize font-bold");
    expect(printPage).toContain('height: 296mm !important');
    expect(printPage).toContain('.proposal-title { font-size: 44px !important');
    expect(printPage).toContain('overflow-wrap: normal !important');
    expect(printPage).toContain('.print-root > section > [id^="page-"]');
  });

  it("renders a meaningful Basic-template closing page", () => {
    const basic = fs.readFileSync(
      path.join(root, "features/templates/components/basic.tsx"),
      "utf8"
    );

    expect(basic).toContain("<ThankYouPage");
    expect(basic).toContain('templateType="basic"');
    expect(basic).toContain("serviceCategory={serviceCategory}");
  });
});
