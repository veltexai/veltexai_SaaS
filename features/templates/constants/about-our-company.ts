import {
  ShieldIcon,
  LocationIcon,
  StartIcon,
  EductationIcon,
} from "@/components/icons";
import { ComponentType } from "react";

type IconComponent = ComponentType<{ className?: string }>;

export const BULLET_ICONS: IconComponent[] = [
  ShieldIcon,
  LocationIcon,
  EductationIcon,
  StartIcon,
];
