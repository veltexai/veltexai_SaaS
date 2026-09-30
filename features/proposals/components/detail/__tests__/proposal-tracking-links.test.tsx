/** @jest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ProposalTrackingLinks } from "../proposal-tracking-links";

const activeLink = {
  id: "22222222-2222-4222-8222-222222222222",
  recipient_email: "client@example.com",
  delivery_method: "online_only",
  email_sent_at: "2026-09-30T18:00:00.000Z",
  created_at: "2026-09-30T18:00:00.000Z",
  view_count: 2,
  download_count: 1,
  revoked_at: null,
};

describe("ProposalTrackingLinks", () => {
  const response = (payload: unknown, ok = true) => ({
    ok,
    json: async () => payload,
  });

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("shows revoke only to managers and refreshes to the revoked state", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(response({ links: [activeLink], canRevoke: true }))
      .mockResolvedValueOnce(response(null))
      .mockResolvedValueOnce(
        response({
          links: [{ ...activeLink, revoked_at: "2026-09-30T19:00:00.000Z" }],
          canRevoke: true,
        }),
      );
    global.fetch = fetchMock;

    render(<ProposalTrackingLinks proposalId="11111111-1111-4111-8111-111111111111" />);
    const button = await screen.findByRole("button", { name: /revoke link/i });
    fireEvent.click(button);
    await screen.findByText("Revoked");
    expect(screen.queryByRole("button", { name: /revoke link/i })).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/revoke"), expect.objectContaining({ method: "POST" }));
  });

  it("keeps links read-only for estimators and viewers", async () => {
    global.fetch = jest.fn().mockResolvedValue(response({ links: [activeLink], canRevoke: false }));
    render(<ProposalTrackingLinks proposalId="11111111-1111-4111-8111-111111111111" />);
    await screen.findByText("client@example.com");
    expect(screen.queryByRole("button", { name: /revoke link/i })).toBeNull();
  });

  it("preserves the active state when revocation fails", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(response({ links: [activeLink], canRevoke: true }))
      .mockResolvedValueOnce(response({ error: "failed" }, false));
    render(<ProposalTrackingLinks proposalId="11111111-1111-4111-8111-111111111111" />);
    fireEvent.click(await screen.findByRole("button", { name: /revoke link/i }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/could not be revoked/i));
    expect(screen.getByText("Active")).not.toBeNull();
  });
});
