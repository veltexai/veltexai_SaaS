import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { getRoleBadgeVariant, ROLE_LABELS } from "../constants/roles";
import type { OrganizationRole } from "../domain";

interface RoleBadgeProps {
  role: OrganizationRole;
  className?: string;
}

/** Visual + accessible label for owner/admin/estimator/viewer roles. */
export function RoleBadge({ role, className }: RoleBadgeProps) {
  return (
    <Badge variant={getRoleBadgeVariant(role)} className={cn(className)}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
