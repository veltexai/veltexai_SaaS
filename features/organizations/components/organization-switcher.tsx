"use client";

import { Building2, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { Organization } from "../types/organization";

interface OrganizationSwitcherProps {
  organizations: Organization[];
  activeOrganizationId: string | null;
  onChange: (organizationId: string) => void;
  status: "loading" | "error" | "success";
  className?: string;
}

/**
 * Accessible organization switcher shell. Renders as a labeled menu button
 * that opens a radio-style menu of organizations — this mirrors how members
 * pick a single active workspace elsewhere in the product's account
 * switchers, and it degrades cleanly to zero/one organization.
 */
export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
  onChange,
  status,
  className,
}: OrganizationSwitcherProps) {
  if (status === "loading") {
    // Fixed width on purpose: this placeholder has no text content, so if it
    // inherited an "auto" width from the caller inside a flex row it would
    // collapse to zero width and become visually invisible.
    return (
      <Skeleton
        className="h-9 w-full sm:w-56 motion-reduce:animate-none"
        aria-label="Loading organizations"
        role="status"
      />
    );
  }

  if (status === "error") {
    return (
      <Button variant="outline" disabled className={className}>
        <Building2 />
        Organizations unavailable
      </Button>
    );
  }

  const activeOrganization = organizations.find(
    (org) => org.id === activeOrganizationId,
  );

  if (organizations.length === 0) {
    return (
      <Button variant="outline" disabled className={className}>
        <Building2 />
        No organizations
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={className}
          aria-label={`Switch organization, current organization: ${
            activeOrganization?.name ?? "none selected"
          }`}
        >
          <Building2 />
          <span
            className="max-w-[10rem] truncate sm:max-w-[16rem]"
            title={activeOrganization?.name}
          >
            {activeOrganization?.name ?? "Select organization"}
          </span>
          <ChevronsUpDown className="ml-auto opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-64 motion-reduce:animate-none motion-reduce:duration-0"
      >
        <DropdownMenuLabel>Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={activeOrganizationId ?? undefined}
          onValueChange={onChange}
        >
          {organizations.map((org) => (
            <DropdownMenuRadioItem key={org.id} value={org.id}>
              <span className="block max-w-full truncate" title={org.name}>
                {org.name}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
