"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  BadgeIndianRupee,
  BookTemplate,
  Boxes,
  ContactRound,
  FileBarChart,
  FileStack,
  FileSignature,
  HandCoins,
  Handshake,
  MessagesSquare,
  Landmark,
  MapPinned,
  Network,
  ReceiptIndianRupee,
  ScrollText,
  ShoppingBag,
  BriefcaseBusiness,
  Tickets,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import {
  fetchMembershipsForUser,
  toWorkspaceMembership,
} from "@/lib/services/appwriteServices";
import { can, type WorkspacePermission } from "@/lib/workspace/permissions";
import type { WorkspaceMembership } from "@/types";

const navigation = [
  {
    label: "",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        permission: "business.view",
      },
    ],
  },
  {
    label: "Business",
    items: [
      {
        label: "My business",
        href: "/business",
        icon: Building2,
        permission: "business.view",
      },
      {
        label: "Team",
        href: "/team",
        icon: UsersRound,
        permission: "team.view",
      },
      {
        label: "Business partners",
        href: "/partners",
        icon: Handshake,
        permission: "vendors.view",
      },
      {
        label: "Communication",
        href: "/communication",
        icon: MessagesSquare,
        permission: "team.view",
      },
      {
        label: "Departments",
        href: "/departments",
        icon: Network,
        permission: "team.view",
      },
      {
        label: "Roles & permissions",
        href: "/roles",
        icon: UserCog,
        permission: "team.view",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Projects",
        href: "/projects",
        icon: ClipboardList,
        permission: "projects.view",
      },
      {
        label: "Site management",
        href: "/sites",
        icon: MapPinned,
        permission: "sites.view",
      },
      {
        label: "Clients & leads",
        href: "/clients",
        icon: ContactRound,
        permission: "clients.view",
      },
      {
        label: "Vendors & suppliers",
        href: "/vendors",
        icon: Boxes,
        permission: "vendors.view",
      },
      {
        label: "Tasks & tickets",
        href: "/tasks",
        icon: Tickets,
        permission: "tasks.view",
      },
      {
        label: "AMC & services",
        href: "/services",
        icon: ShieldCheck,
        permission: "services.view",
      },
    ],
  },
  {
    label: "Finance",
    items: [
      {
        label: "Items & services",
        href: "/items",
        icon: Boxes,
        permission: "finance.view",
      },
      {
        label: "Invoices",
        href: "/invoices",
        icon: ReceiptIndianRupee,
        permission: "finance.view",
      },
      {
        label: "Proforma invoices",
        href: "/proforma-invoices",
        icon: FileSignature,
        permission: "finance.view",
      },
      {
        label: "Payments",
        href: "/payments",
        icon: HandCoins,
        permission: "finance.view",
      },
      {
        label: "Expenses",
        href: "/expenses",
        icon: WalletCards,
        permission: "finance.view",
      },
      {
        label: "Quotations",
        href: "/quotations",
        icon: ScrollText,
        permission: "finance.view",
      },
      {
        label: "Purchase orders",
        href: "/purchase-orders",
        icon: ShoppingBag,
        permission: "finance.view",
      },
      {
        label: "Work orders",
        href: "/work-orders",
        icon: BriefcaseBusiness,
        permission: "finance.view",
      },
      {
        label: "Reports",
        href: "/reports",
        icon: FileBarChart,
        permission: "reports.view",
      },
    ],
  },
  {
    label: "Documents",
    items: [
      {
        label: "Documents",
        href: "/documents",
        icon: FileText,
        permission: "documents.view",
      },
      {
        label: "Templates",
        href: "/templates",
        icon: BookTemplate,
        permission: "documents.view",
      },
      {
        label: "Files & media",
        href: "/files",
        icon: FileStack,
        permission: "documents.view",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        label: "Business settings",
        href: "/business-settings",
        icon: Settings,
        permission: "settings.manage",
      },
      {
        label: "Integrations",
        href: "/integrations",
        icon: Landmark,
        permission: "settings.manage",
      },
      {
        label: "Account settings",
        href: "/account-settings",
        icon: BadgeIndianRupee,
        permission: "business.view",
      },
    ],
  },
];

export function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const [membership, setMembership] = useState<WorkspaceMembership | null>(
    null,
  );

  useEffect(() => {
    let active = true;
    if (!profile?.userId) return;
    fetchMembershipsForUser(profile.userId)
      .then((documents) => {
        if (!active) return;
        const memberships = documents.map(toWorkspaceMembership);
        setMembership(
          memberships.find(
            (item) => item.businessId === profile.activeBusinessId,
          ) ??
            memberships[0] ??
            null,
        );
      })
      .catch(() => setMembership(null));
    return () => {
      active = false;
    };
  }, [profile?.activeBusinessId, profile?.userId]);

  async function signOut() {
    await logout();
    window.location.assign("https://app.amcmep.in");
  }

  return (
    <>
      {isOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[220px] flex-col bg-[#071426] text-white transition-transform duration-200 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-3.5">
          <a href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/amcmep-one-icon.png"
              alt="AMC MEP Workspace"
              width={36}
              height={36}
              className="rounded-md"
              priority
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">AMC MEP</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-blue-300">
                Workspace
              </p>
            </div>
          </a>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3.5">
          <div className="space-y-3.5">
            {navigation.map((group, index) => {
              const visible = group.items.filter(
                (item) =>
                  !membership ||
                  can(membership, item.permission as WorkspacePermission),
              );
              if (!visible.length) return null;
              return (
                <section key={group.label || index}>
                  {group.label ? (
                    <p className="mb-1.5 px-2.5 text-[9px] font-bold uppercase text-slate-500">
                      {group.label}
                    </p>
                  ) : null}
                  <ul className="space-y-0.5">
                    {visible.map((item) => {
                      const active =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href));
                      return (
                        <li key={item.href}>
                          <a
                            href={item.href}
                            onClick={onClose}
                            className={`flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs font-semibold transition ${active ? "bg-blue-600 text-white shadow-sm" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}
                          >
                            <item.icon size={15} />
                            <span className="truncate">{item.label}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-white/10 p-2.5">
          <a
            href="https://app.amcmep.in"
            className="mb-1 flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs font-semibold text-slate-300 hover:bg-white/8 hover:text-white"
          >
            <ArrowUpRight size={15} />
            Open One App
          </a>
          <button
            onClick={signOut}
            className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
          >
            <LogOut size={15} />
            Sign out
          </button>
          <div className="mt-2 border-t border-white/10 px-2.5 pt-2">
            <p className="truncate text-[11px] font-semibold text-white">
              {profile?.name || "Member"}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">
              {profile?.customerId || profile?.email}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
