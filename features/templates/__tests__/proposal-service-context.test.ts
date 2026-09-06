import {
  getProposalWording,
  resolveServiceCategory,
} from "../utils/proposal-service-context";

describe("proposal service context", () => {
  it("uses residential language for residential proposals", () => {
    const source = { service_type: "residential" };
    expect(resolveServiceCategory(source)).toBe("residential");
    expect(getProposalWording(source)).toMatchObject({
      site: "home",
      servicePlan: "residential cleaning service",
    });
  });

  it("keeps commercial language for commercial proposals", () => {
    expect(getProposalWording({ service_type: "commercial" })).toMatchObject({
      site: "facility",
      servicePlan: "commercial cleaning program",
    });
  });
});
