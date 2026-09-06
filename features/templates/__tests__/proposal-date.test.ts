import {
  createLocalProposalDateMetadata,
  formatProposalDateLong,
  formatProposalDateShort,
} from "../utils/proposal-date";

describe("proposal date", () => {
  it("uses stored creator-local calendar metadata ahead of UTC created_at", () => {
    const source = {
      created_at: "2026-09-04T00:30:00.000Z",
      global_inputs: { proposal_date: "2026-09-03", proposal_timezone: "America/Los_Angeles" },
    };
    expect(formatProposalDateShort(source)).toBe("09/03/26");
    expect(formatProposalDateLong(source)).toBe("September 3, 2026");
  });

  it("uses a deterministic UTC calendar fallback for legacy rows", () => {
    expect(formatProposalDateShort({ created_at: "2026-09-04T00:30:00.000Z" })).toBe("09/04/26");
  });

  it("creates a local YYYY-MM-DD without converting through UTC", () => {
    expect(createLocalProposalDateMetadata(new Date(2026, 8, 3, 23, 30)).proposal_date).toBe("2026-09-03");
  });
});
