/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TeamSettingsShell } from "../components/team-settings-shell";
import { createMockTeamAdapter } from "../lib/mock-team-adapter";
import type { TeamAdapter } from "../types/organization";
import { FIXTURE_ORGANIZATIONS } from "../lib/fixtures";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("TeamSettingsShell", () => {
  it("loads organizations and members, then supports inviting a teammate end-to-end", async () => {
    const adapter = createMockTeamAdapter({ latencyMs: 0 });
    render(<TeamSettingsShell adapter={adapter} />);

    // Loading, then the default organization's roster renders. Both the
    // desktop table and the mobile card list are in the DOM simultaneously
    // (CSS toggles which is visible), so scope queries to the table.
    const table = await screen.findByRole("table", { name: "Team members" });
    expect(within(table).getByText("Anthony Veliz")).toBeInTheDocument();

    // Open the invite dialog and submit a new teammate.
    fireEvent.click(screen.getByRole("button", { name: /invite teammate/i }));
    const dialog = await screen.findByRole("dialog", { name: "Invite a teammate" });

    fireEvent.change(
      screen.getByLabelText("Email address"),
      { target: { value: "new.hire@example.com" } },
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /send invite/i }),
      );
    });

    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });

    expect(within(table).getByText("new.hire@example.com")).toBeInTheDocument();
  });

  it("switches the member list when a different organization is selected", async () => {
    const adapter = createMockTeamAdapter({ latencyMs: 0 });
    render(<TeamSettingsShell adapter={adapter} />);

    const initialTable = await screen.findByRole("table", { name: "Team members" });
    expect(within(initialTable).getByText("Anthony Veliz")).toBeInTheDocument();

    fireEvent.keyDown(
      screen.getByRole("button", { name: /current organization/i }),
      { key: "Enter" },
    );
    const otherOrgOption = await screen.findByRole("menuitemradio", {
      name: "Summit Facilities Group",
    });
    fireEvent.click(otherOrgOption);

    // Summit Facilities Group's fixture roster is empty.
    expect(await screen.findByText("No teammates yet")).toBeInTheDocument();
    expect(screen.queryByText("Anthony Veliz")).not.toBeInTheDocument();
  });

  it("shows a neutral member area and a disabled switcher when organizations fail to load", async () => {
    const adapter = createMockTeamAdapter({ latencyMs: 0, scenario: "error" });
    render(<TeamSettingsShell adapter={adapter} />);

    expect(
      await screen.findByRole("button", { name: /organizations unavailable/i }),
    ).toBeDisabled();
    expect(screen.getByText("No organization selected")).toBeInTheDocument();
    // Inviting is disabled without a resolvable active organization.
    expect(screen.getByRole("button", { name: /invite teammate/i })).toBeDisabled();
  });

  it("surfaces a retryable error when the member roster itself fails to load", async () => {
    const listMembers = jest
      .fn()
      .mockRejectedValue(new Error("Roster service is down"));
    const adapter: TeamAdapter = {
      listOrganizations: async () => FIXTURE_ORGANIZATIONS,
      listMembers,
      inviteMember: jest.fn(),
    };

    render(<TeamSettingsShell adapter={adapter} />);

    expect(
      await screen.findByText("Couldn't load team members"),
    ).toBeInTheDocument();
    expect(screen.getByText("Roster service is down")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => expect(listMembers).toHaveBeenCalledTimes(2));
  });
});
