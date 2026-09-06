import {
  TRIAL_ALLOWANCE_COPY,
  TRIAL_DURATION_DAYS,
  TRIAL_PROPOSAL_LIMIT,
} from "../trial";

describe("trial presentation source of truth", () => {
  it("matches the configured database allowance", () => {
    expect(TRIAL_PROPOSAL_LIMIT).toBe(3);
    expect(TRIAL_DURATION_DAYS).toBe(7);
    expect(TRIAL_ALLOWANCE_COPY).toBe("3 proposals");
  });
});
