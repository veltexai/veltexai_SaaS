import fs from "node:fs";
import path from "node:path";

describe("proposal print layout contract", () => {
  const root = process.cwd();

  it("keeps cover titles readable and prevents page-size overflow", () => {
    const printPage = fs.readFileSync(
      path.join(
        root,
        "features/templates/components/canonical-print-document.tsx"
      ),
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

  it("revalidates tracked print authorization without a service credential", () => {
    const trackedPage = fs.readFileSync(
      path.join(root, "app/print/tracked/[id]/page.tsx"),
      "utf8"
    );
    const generator = fs.readFileSync(
      path.join(
        root,
        "features/proposals/services/pdf/playwright-generator.ts"
      ),
      "utf8"
    );
    const downloadRoute = fs.readFileSync(
      path.join(root, "app/api/proposals/[id]/download/route.ts"),
      "utf8"
    );

    expect(trackedPage).toContain("read_tracked_proposal_print");
    expect(trackedPage).toContain("tracked_proposal_has_paid_access");
    expect(trackedPage).toContain("payload?.tracking?.proposal_id !== id");
    expect(trackedPage).not.toContain("createServiceClient");
    expect(trackedPage).not.toContain("service_role");
    expect(generator).toContain("sameSite: 'Strict'");
    expect(generator).toContain("path: `/print/tracked/${id}`");
    expect(generator).not.toContain("?tracking=");
    expect(downloadRoute).toContain("generateTrackedProposalPDFWithPlaywright(id, trackingId)");
  });

  it("keeps the tracked print projection customer-safe and presentation-complete", () => {
    const migration = fs.readFileSync(
      path.join(
        root,
        "supabase/migrations/20260925009000_r2_tracked_print_projection.sql"
      ),
      "utf8"
    );

    expect(migration).toContain("'template'");
    expect(migration).toContain("'colors'");
    expect(migration).toContain("'show_powered_by'");
    expect(migration).toContain("'additional_services'");
    expect(migration).toContain("grant execute on function public.read_tracked_proposal_print(text) to anon, authenticated");
    expect(migration).not.toMatch(/'cost'|'margin'|'access_notes'|'service_profile'/);
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

  it("omits empty closing-page contact rows", () => {
    const thankYou = fs.readFileSync(
      path.join(
        root,
        "features/templates/components/sections/thank-you-section.tsx"
      ),
      "utf8"
    );

    expect(thankYou).toContain("{email ? (");
    expect(thankYou).toContain("{phone ? (");
    expect(thankYou).toContain("{website ? (");
    expect(thankYou).toContain("serving your cleaning needs");
  });
});
