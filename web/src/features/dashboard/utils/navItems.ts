import {
  BookOpen,
  Clock,
  House,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Soup,
  Store,
  Users,
  type LucideIcon,
} from "lucide-react";
import { BRAND_ROLES, MODIFIER_ROLES, STAFF_ACCOUNT_ROLES } from "@/src/features/auth/utils/webRoles";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  count?: number;
  /** Only these roles see the link; omit for every web role. */
  roles?: ReadonlySet<string>;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  { items: [{ label: "Workspace", href: "/dashboard", icon: House }] },
  {
    label: "Operations",
    items: [
      { label: "Orders", href: "/dashboard/orders", icon: ShoppingBag },
      { label: "Menu & Availability", href: "/dashboard/menu", icon: Soup },
      { label: "Kitchen Overview", href: "/dashboard/kitchen-overview", icon: Clock },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Recipes", href: "/dashboard/recipes", icon: BookOpen },
      { label: "Modifiers", href: "/dashboard/modifiers", icon: SlidersHorizontal, roles: MODIFIER_ROLES },
      { label: "Audit History", href: "/dashboard/audit-history", icon: ShieldCheck },
      { label: "Brands", href: "/dashboard/brands", icon: Store, roles: BRAND_ROLES },
      { label: "Staff Accounts", href: "/dashboard/staff", icon: Users, roles: STAFF_ACCOUNT_ROLES },
    ],
  },
];

/** The menu as a given role sees it: hidden links removed, then empty groups dropped. */
export function navGroupsFor(role: string): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.has(role)),
  })).filter((group) => group.items.length > 0);
}
