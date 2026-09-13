import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("Meta acquisition readiness contracts", () => {
  it("routes free-trial CTAs to signup while preserving sign-in", () => {
    const header = read("features/home/components/header.tsx");
    const pricing = read("features/home/components/pricing-section.tsx");
    const marketingCtas = read("features/home/components/marketing-ctas.tsx");
    const routes = read("features/auth/constants/index.ts");

    expect(routes).toContain('LOGIN: "/auth/login"');
    expect(routes).toContain('SIGNUP: "/auth/signup"');
    expect(header).toContain('<Link href="/auth/login">');
    expect(header).toContain('<Link href="/auth/signup">');
    expect(pricing).toContain("<Link href={AUTH_ROUTES.SIGNUP}>");
    expect(marketingCtas).toContain("gradient: AUTH_ROUTES.SIGNUP");
  });

  it("uses matching browser/server registration IDs and a proposal activation ID", () => {
    const browserTracker = read("components/MetaPixelTracker.tsx");
    const callback = read("app/api/auth/callback/route.ts");
    const proposals = read("app/api/proposals/route.ts");

    expect(browserTracker).toContain("`complete_registration:${user.id}`");
    expect(browserTracker).toContain("{ eventID: eventId }");
    expect(callback).toContain("`complete_registration:${user.id}`");
    expect(proposals).toContain("`first_proposal:${proposal.id}`");
    expect(proposals).toContain("sendFirstProposalEvent");
  });

  it("preserves first touch while refreshing last touch", () => {
    const callback = read("app/api/auth/callback/route.ts");
    expect(callback).toContain('onConflict: "user_id", ignoreDuplicates: true');
    expect(callback).toContain("last_touch: attribution");
    expect(callback).toContain('.eq("user_id", user.id)');
  });
});
