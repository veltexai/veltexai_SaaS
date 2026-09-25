import { ORGANIZATION_ROLES } from "../types/organization";
import {
  getRoleBadgeVariant,
  INVITABLE_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "../constants/roles";

describe("role constants", () => {
  it("defines exactly the four canonical roles", () => {
    expect(ORGANIZATION_ROLES).toEqual(["owner", "admin", "estimator", "viewer"]);
  });

  it("has a label and description for every role", () => {
    for (const role of ORGANIZATION_ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_DESCRIPTIONS[role]).toBeTruthy();
    }
  });

  it("excludes owner from the invitable roles", () => {
    expect(INVITABLE_ROLES).not.toContain("owner");
    expect(INVITABLE_ROLES).toEqual(["admin", "estimator", "viewer"]);
  });

  it("gives owner the strongest badge variant and viewer/estimator the lightest", () => {
    expect(getRoleBadgeVariant("owner")).toBe("default");
    expect(getRoleBadgeVariant("admin")).toBe("secondary");
    expect(getRoleBadgeVariant("estimator")).toBe("outline");
    expect(getRoleBadgeVariant("viewer")).toBe("outline");
  });
});
