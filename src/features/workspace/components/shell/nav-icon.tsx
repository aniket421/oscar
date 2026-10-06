import type { ComponentType } from "react";

import {
  CodeIcon,
  ConversationIcon,
  DocumentIcon,
  MicrophoneIcon,
  OverviewIcon,
  RouteIcon,
  SlidersIcon,
  TerminalIcon,
  UserIcon,
  type IconProps,
} from "@/components/icons";

import type { NavIcon as NavIconName } from "../../navigation";

const icons: Record<NavIconName, ComponentType<IconProps>> = {
  overview: OverviewIcon,
  interviews: MicrophoneIcon,
  resume: DocumentIcon,
  roadmap: RouteIcon,
  technical: TerminalIcon,
  behavioral: ConversationIcon,
  coding: CodeIcon,
  profile: UserIcon,
  settings: SlidersIcon,
};

export function NavIcon({ name, ...props }: IconProps & { name: NavIconName }) {
  const Icon = icons[name];
  return <Icon {...props} />;
}
