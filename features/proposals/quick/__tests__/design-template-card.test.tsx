/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { DesignTemplateCard } from "../components/design-template-card";
import type { TemplateItem } from "@/features/proposals/types/proposal";

const template: TemplateItem = {
  id: "tpl-1",
  display_name: "Executive Premium",
  preview_image_url: null,
  tiers: ["professional", "enterprise"],
};

function renderCard(overrides: Partial<
  React.ComponentProps<typeof DesignTemplateCard>
> = {}) {
  const onSelect = jest.fn();
  const onLockedClick = jest.fn();

  render(
    <DesignTemplateCard
      template={template}
      isSelected={false}
      canAccess
      isRecommended={false}
      onSelect={onSelect}
      onLockedClick={onLockedClick}
      {...overrides}
    />,
  );

  return { onSelect, onLockedClick };
}

describe("DesignTemplateCard", () => {
  it("selects when an unlocked card is clicked", () => {
    const { onSelect, onLockedClick } = renderCard();
    fireEvent.click(screen.getByRole("button"));

    expect(onSelect).toHaveBeenCalledWith("tpl-1");
    expect(onLockedClick).not.toHaveBeenCalled();
  });

  it("opens the upgrade path instead of selecting when locked", () => {
    const { onSelect, onLockedClick } = renderCard({ canAccess: false });
    const card = screen.getByRole("button");

    fireEvent.click(card);

    expect(onLockedClick).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
    // Locked cards stay actionable — they open a dialog, so they must not be
    // marked disabled or dropped from the tab order.
    expect(card).toHaveAttribute("aria-haspopup", "dialog");
    expect(card).not.toHaveAttribute("aria-disabled");
    expect(card).not.toBeDisabled();
  });

  it("names the tier that unlocks a locked template", () => {
    renderCard({
      canAccess: false,
      template: { ...template, tiers: ["enterprise"] },
    });

    expect(screen.getByText("Enterprise")).toBeInTheDocument();
  });

  it("reflects selection to assistive tech", () => {
    renderCard({ isSelected: true });
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the recommended badge only when flagged", () => {
    const { unmount } = render(
      <DesignTemplateCard
        template={template}
        isSelected={false}
        canAccess
        isRecommended
        onSelect={jest.fn()}
        onLockedClick={jest.fn()}
      />,
    );
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    unmount();

    renderCard();
    expect(screen.queryByText("Recommended")).not.toBeInTheDocument();
  });

  // The thumbnail is decorative (alt=""), so it has no "img" role to query —
  // the accessible name comes from the adjacent template title.
  const thumbnail = () => document.querySelector("img");

  it("falls back to the placeholder when the preview art is missing", () => {
    // The four preview PNGs are not on disk yet, so a 404 must degrade to the
    // icon rather than leaving a broken frame.
    renderCard({ fallbackImage: "/images/templates/previews/missing.png" });

    const image = thumbnail();
    expect(image).not.toBeNull();

    fireEvent.error(image!);
    expect(thumbnail()).toBeNull();
  });

  it("renders the placeholder when there is no art at all", () => {
    renderCard();
    expect(thumbnail()).toBeNull();
    expect(screen.getByText("Executive Premium")).toBeInTheDocument();
  });
});
