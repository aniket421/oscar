import type { Capability } from "./availability";

export type NavIcon =
  | "overview"
  | "interviews"
  | "resume"
  | "roadmap"
  | "technical"
  | "behavioral"
  | "coding"
  | "profile"
  | "settings";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
}

export interface NavGroup {
  label: string;
  items: readonly NavItem[];
  /** Capability that must be available before the group is considered live. */
  capability?: Capability;
}

/** The workspace's primary navigation. Every href is a protected route. */
export const workspaceNavigation: readonly NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: "overview" },
      { label: "Interviews", href: "/interviews", icon: "interviews" },
      { label: "Resume", href: "/resume", icon: "resume" },
      { label: "Roadmap", href: "/roadmap", icon: "roadmap" },
    ],
  },
  {
    label: "Preparation",
    capability: "practice",
    items: [
      { label: "Technical", href: "/practice/technical", icon: "technical" },
      { label: "Behavioral", href: "/practice/behavioral", icon: "behavioral" },
      { label: "Coding", href: "/practice/coding", icon: "coding" },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", href: "/profile", icon: "profile" },
      { label: "Settings", href: "/settings", icon: "settings" },
    ],
  },
];

/** True when `pathname` is the item's page or one of its sub-pages. */
export function isActiveHref(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The group and item for a pathname, used for the header's context line. */
export function findNavLocation(pathname: string): { group: NavGroup; item: NavItem } | null {
  for (const group of workspaceNavigation) {
    const item = group.items.find((candidate) => isActiveHref(pathname, candidate.href));
    if (item) return { group, item };
  }
  return null;
}
