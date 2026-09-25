/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { OrganizationSwitcher } from "../components/organization-switcher";
import type { Organization } from "../types/organization";

const organizations: Organization[] = [
  { id: "org-1", name: "Veltex Cleaning Co.", slug: "veltex-cleaning-co" },
  { id: "org-2", name: "Summit Facilities Group", slug: "summit-facilities-group" },
];

describe("OrganizationSwitcher", () => {
  it("shows a loading placeholder", () => {
    render(
      <OrganizationSwitcher
        organizations={[]}
        activeOrganizationId={null}
        onChange={jest.fn()}
        status="loading"
      />,
    );

    expect(
      screen.getByRole("status", { name: "Loading organizations" }),
    ).toBeInTheDocument();
  });

  it("keeps the loading placeholder visible instead of collapsing to zero width", () => {
    // Regression: the placeholder has no text content, so if it inherited an
    // "auto" width inside a flex row it would collapse to zero width and
    // become visually invisible even though it's technically in the DOM.
    render(
      <OrganizationSwitcher
        organizations={[]}
        activeOrganizationId={null}
        onChange={jest.fn()}
        status="loading"
        className="w-full sm:w-auto"
      />,
    );

    const placeholder = screen.getByRole("status", {
      name: "Loading organizations",
    });
    expect(placeholder).not.toHaveClass("sm:w-auto");
    expect(placeholder.className).toMatch(/w-full/);
  });

  it("shows a disabled control when organizations fail to load", () => {
    render(
      <OrganizationSwitcher
        organizations={[]}
        activeOrganizationId={null}
        onChange={jest.fn()}
        status="error"
      />,
    );

    expect(
      screen.getByRole("button", { name: /organizations unavailable/i }),
    ).toBeDisabled();
  });

  it("shows a disabled control when there are no organizations", () => {
    render(
      <OrganizationSwitcher
        organizations={[]}
        activeOrganizationId={null}
        onChange={jest.fn()}
        status="success"
      />,
    );

    expect(
      screen.getByRole("button", { name: /no organizations/i }),
    ).toBeDisabled();
  });

  it("announces the current organization on the trigger", () => {
    render(
      <OrganizationSwitcher
        organizations={organizations}
        activeOrganizationId="org-1"
        onChange={jest.fn()}
        status="success"
      />,
    );

    expect(
      screen.getByRole("button", {
        name: /current organization: veltex cleaning co\./i,
      }),
    ).toBeInTheDocument();
  });

  it("lets the user switch to a different organization from the menu", async () => {
    const onChange = jest.fn();
    render(
      <OrganizationSwitcher
        organizations={organizations}
        activeOrganizationId="org-1"
        onChange={onChange}
        status="success"
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /current organization/i }),
      { key: "Enter" },
    );

    const option = await screen.findByRole("menuitemradio", {
      name: "Summit Facilities Group",
    });
    fireEvent.click(option);

    expect(onChange).toHaveBeenCalledWith("org-2");
  });

  it("truncates a very long organization name but preserves it via title", () => {
    const longName =
      "Summit Facilities Group of Greater Metropolitan Downtown Commercial Properties LLC";
    render(
      <OrganizationSwitcher
        organizations={[{ id: "org-1", name: longName, slug: "long" }]}
        activeOrganizationId="org-1"
        onChange={jest.fn()}
        status="success"
      />,
    );

    const label = screen.getByText(longName);
    expect(label).toHaveClass("truncate");
    expect(label).toHaveAttribute("title", longName);
  });

  it("returns keyboard focus to the trigger after the menu closes", async () => {
    render(
      <OrganizationSwitcher
        organizations={organizations}
        activeOrganizationId="org-1"
        onChange={jest.fn()}
        status="success"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: /current organization/i,
    });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "Enter" });

    const option = await screen.findByRole("menuitemradio", {
      name: "Summit Facilities Group",
    });
    fireEvent.keyDown(option, { key: "Escape" });

    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("marks the active organization as checked in the menu", async () => {
    render(
      <OrganizationSwitcher
        organizations={organizations}
        activeOrganizationId="org-2"
        onChange={jest.fn()}
        status="success"
      />,
    );

    fireEvent.keyDown(
      screen.getByRole("button", { name: /current organization/i }),
      { key: "Enter" },
    );

    const activeOption = await screen.findByRole("menuitemradio", {
      name: "Summit Facilities Group",
    });
    const inactiveOption = screen.getByRole("menuitemradio", {
      name: "Veltex Cleaning Co.",
    });

    expect(activeOption).toHaveAttribute("aria-checked", "true");
    expect(inactiveOption).toHaveAttribute("aria-checked", "false");
  });
});
