/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { RoleBadge } from "../components/role-badge";
import { ORGANIZATION_ROLES } from "../domain";
import { ROLE_LABELS } from "../constants/roles";

describe("RoleBadge", () => {
  it.each(ORGANIZATION_ROLES)("renders the %s label", (role) => {
    render(<RoleBadge role={role} />);
    expect(screen.getByText(ROLE_LABELS[role])).toBeInTheDocument();
  });

  it("gives the owner badge the strongest visual weight", () => {
    render(<RoleBadge role="owner" />);
    // The primary/default badge variant is reserved for the single owner seat.
    expect(screen.getByText("Owner")).toHaveClass("bg-primary");
  });
});
