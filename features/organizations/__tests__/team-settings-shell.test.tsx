/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { TeamSettingsShell } from "../components/team-settings-shell";
import { createMockTeamAdapter } from "../lib/mock-team-adapter";
import type { TeamAdapter } from "../types/organization";
import { FIXTURE_MEMBERS_BY_ORG, FIXTURE_ORGANIZATIONS } from "../lib/fixtures";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

describe("TeamSettingsShell", () => {
  it("loads organizations and members, then supports inviting a teammate end-to-end (mock demonstration only, invitations explicitly enabled)", async () => {
    const adapter = createMockTeamAdapter({
      latencyMs: 0,
      capabilities: { invitationsEnabled: true },
    });
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
      getActiveOrganizationId: async () => FIXTURE_ORGANIZATIONS[0]?.id ?? null,
      setActiveOrganizationId: jest.fn(),
      listMembers,
      getCapabilities: async () => ({ invitationsEnabled: false }),
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

  it("fails closed by default: explains invitations aren't enabled, never sends one, never adds a roster member", async () => {
    // No `capabilities` override — this is the real production-facing
    // default, which must stay disabled until a real invitation contract
    // ships.
    const adapter = createMockTeamAdapter({ latencyMs: 0 });
    render(<TeamSettingsShell adapter={adapter} />);

    const table = await screen.findByRole("table", { name: "Team members" });
    const initialRowCount = within(table).getAllByRole("row").length;

    const inviteButton = screen.getByRole("button", { name: /invite teammate/i });
    expect(inviteButton).toBeEnabled();
    fireEvent.click(inviteButton);

    expect(
      await screen.findByRole("dialog", {
        name: "Team invitations aren't enabled yet",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^got it$/i }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );

    // No roster mutation occurred, and focus returns to the trigger.
    expect(within(table).getAllByRole("row")).toHaveLength(initialRowCount);
    expect(inviteButton).toHaveFocus();
  });

  it("returns focus to the invite trigger after cancelling the (enabled) invite dialog", async () => {
    const adapter = createMockTeamAdapter({
      latencyMs: 0,
      capabilities: { invitationsEnabled: true },
    });
    render(<TeamSettingsShell adapter={adapter} />);

    await screen.findByRole("table", { name: "Team members" });

    const inviteButton = screen.getByRole("button", { name: /invite teammate/i });
    inviteButton.focus();
    fireEvent.click(inviteButton);

    await screen.findByRole("dialog", { name: "Invite a teammate" });
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(inviteButton).toHaveFocus();
  });

  it("shows the loading skeleton while a slower network resolves, then the roster", async () => {
    const adapter = createMockTeamAdapter({ latencyMs: 50 });
    render(<TeamSettingsShell adapter={adapter} />);

    // Before the organization itself resolves, there's no active
    // organization yet, so the member area is neutral, not "loading".
    expect(screen.getByText("No organization selected")).toBeInTheDocument();

    // Once the organization resolves, the roster fetch for it begins and
    // is visibly "loading" until it too resolves.
    await waitFor(() => {
      expect(
        screen.getByRole("status", { name: "Loading team members" }),
      ).toBeInTheDocument();
    });

    const table = await screen.findByRole("table", { name: "Team members" });
    expect(within(table).getByText("Anthony Veliz")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading team members" }),
    ).not.toBeInTheDocument();
  });

  it("honors the adapter's persisted active organization instead of always picking the first listed", async () => {
    const adapter = createMockTeamAdapter({
      latencyMs: 0,
      activeOrganizationId: "org-summit-facilities",
    });
    render(<TeamSettingsShell adapter={adapter} />);

    expect(await screen.findByText("No teammates yet")).toBeInTheDocument();
    expect(screen.queryByText("Anthony Veliz")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /current organization/i }),
    ).toHaveTextContent("Summit Facilities Group");
  });

  it("does not change the displayed organization when setActiveOrganizationId rejects", async () => {
    const setActiveOrganizationId = jest
      .fn()
      .mockRejectedValue(new Error("You don't have access to that organization."));
    const adapter: TeamAdapter = {
      listOrganizations: async () => FIXTURE_ORGANIZATIONS,
      getActiveOrganizationId: async () => "org-veltex-cleaning",
      setActiveOrganizationId,
      listMembers: async (organizationId) =>
        FIXTURE_MEMBERS_BY_ORG[organizationId] ?? [],
      getCapabilities: async () => ({ invitationsEnabled: false }),
      inviteMember: jest.fn(),
    };

    render(<TeamSettingsShell adapter={adapter} />);

    const table = await screen.findByRole("table", { name: "Team members" });
    expect(within(table).getByText("Anthony Veliz")).toBeInTheDocument();

    fireEvent.keyDown(
      screen.getByRole("button", { name: /current organization/i }),
      { key: "Enter" },
    );
    fireEvent.click(
      await screen.findByRole("menuitemradio", {
        name: "Summit Facilities Group",
      }),
    );

    await waitFor(() => expect(setActiveOrganizationId).toHaveBeenCalled());
    expect(within(table).getByText("Anthony Veliz")).toBeInTheDocument();
    expect(screen.queryByText("No teammates yet")).not.toBeInTheDocument();
  });

  it("never leaks fixture roster or organization names when adapter reads fail", async () => {
    const listMembers = jest
      .fn()
      .mockResolvedValue(FIXTURE_MEMBERS_BY_ORG["org-veltex-cleaning"]);
    const inviteMember = jest.fn();
    const adapter: TeamAdapter = {
      listOrganizations: async () => {
        throw new Error("Team management isn't available yet. Check back soon.");
      },
      getActiveOrganizationId: async () => "org-veltex-cleaning",
      setActiveOrganizationId: jest.fn(),
      listMembers,
      getCapabilities: async () => ({ invitationsEnabled: true }),
      inviteMember,
    };

    render(<TeamSettingsShell adapter={adapter} />);

    expect(
      await screen.findByRole("button", { name: /organizations unavailable/i }),
    ).toBeDisabled();
    expect(screen.getByText("No organization selected")).toBeInTheDocument();
    expect(screen.queryByText("Anthony Veliz")).not.toBeInTheDocument();
    expect(screen.queryByText("Jordan Rivera")).not.toBeInTheDocument();
    expect(screen.queryByText("Veltex Cleaning Co.")).not.toBeInTheDocument();
    expect(screen.queryByText("Summit Facilities Group")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Team members" })).not.toBeInTheDocument();
    expect(listMembers).not.toHaveBeenCalled();
    expect(inviteMember).not.toHaveBeenCalled();
  });

  it("fails closed by default with no adapter prop at all — never falls back to fixture/mock data", async () => {
    // No `adapter` prop, matching how the production page renders this
    // shell when `resolveTeamAdapter` returns `createUnavailableTeamAdapter()`.
    // This is the shell's own internal default, independent of the page's
    // resolution logic — defense in depth so it fails closed even if a
    // future caller forgets to pass an adapter.
    render(<TeamSettingsShell />);

    expect(
      await screen.findByRole("button", { name: /organizations unavailable/i }),
    ).toBeDisabled();
    expect(screen.getByText("No organization selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /invite teammate/i })).toBeDisabled();

    // Proves no fixture data ever rendered: none of the known fixture
    // organization/member names appear anywhere in the document.
    expect(screen.queryByText("Anthony Veliz")).not.toBeInTheDocument();
    expect(screen.queryByText("Jordan Rivera")).not.toBeInTheDocument();
    expect(screen.queryByText("Veltex Cleaning Co.")).not.toBeInTheDocument();
    expect(screen.queryByText("Summit Facilities Group")).not.toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Team members" })).not.toBeInTheDocument();
  });
});
