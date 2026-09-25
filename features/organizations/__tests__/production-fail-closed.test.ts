import fs from "node:fs";
import path from "node:path";

const featureRoot = path.join(__dirname, "..");
const pagePath = path.join(
  featureRoot,
  "../../app/dashboard/settings/team/page.tsx",
);
const shellPath = path.join(featureRoot, "components/team-settings-shell.tsx");
const previewPath = path.join(
  featureRoot,
  "components/team-settings-development-preview.tsx",
);

function read(filePath: string) {
  return fs.readFileSync(filePath, "utf8");
}

/**
 * Source-level proof that production cannot render fixtures or activate
 * scenario overrides. Complements the runtime tests on resolveTeamAdapter
 * and UnavailableTeamAdapter.
 */
describe("production fail-closed source boundaries", () => {
  it("the production team page never constructs a mock adapter", () => {
    const source = read(pagePath);
    expect(source).not.toMatch(/createMockTeamAdapter/);
    expect(source).not.toMatch(/createUnavailableTeamAdapter/);
    expect(source).toMatch(/TeamSettingsShell \/>/);
  });

  it("the production team page only loads the mock preview inside a development branch", () => {
    const source = read(pagePath);
    expect(source).toMatch(
      /if \(process\.env\.NODE_ENV === "development"\)/,
    );
    expect(source).toMatch(/TeamSettingsDevelopmentPreview/);
    expect(source.indexOf('process.env.NODE_ENV === "development"')).toBeLessThan(
      source.indexOf("TeamSettingsDevelopmentPreview"),
    );
  });

  it("the production team page never reads searchParams outside the development branch", () => {
    const source = read(pagePath);
    const productionReturn = source.slice(
      source.lastIndexOf("return ("),
    );
    expect(productionReturn).not.toMatch(/searchParams|scenario/);
    expect(productionReturn).toMatch(/<TeamSettingsShell \/>/);
  });

  it("the shared shell never imports or constructs the mock adapter", () => {
    const source = read(shellPath);
    expect(source).not.toMatch(/createMockTeamAdapter/);
    expect(source).not.toMatch(/mock-team-adapter/);
    expect(source).toMatch(/createUnavailableTeamAdapter/);
  });

  it("only the development preview constructs the mock adapter for the page", () => {
    const source = read(previewPath);
    expect(source).toMatch(/resolveTeamAdapter\("development"/);
    expect(source).toMatch(/TeamSettingsShell adapter=\{adapter\}/);
  });
});
