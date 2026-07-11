"use client";

import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import {
  Bell,
  Briefcase,
  ClipboardList,
  Home,
  Gift,
  LogOut,
  MessageSquare,
  Settings,
  ShieldCheck,
  ShoppingCart,
  UserCircle,
  X,
} from "lucide-react";
import type { UserRole } from "@/types";

const navItems: Array<{ label: string; href: string; icon: React.ComponentType<{ className?: string }>; roles: UserRole[] }> = [
  { label: "Home", href: "/", icon: Home, roles: ["customer", "partner", "administrator"] },
  { label: "Assistant", href: "/assistant", icon: MessageSquare, roles: ["customer", "partner", "administrator"] },
  { label: "Messages", href: "/chats", icon: MessageSquare, roles: ["customer", "partner", "administrator"] },
  { label: "Market", href: "/marketplace", icon: ShoppingCart, roles: ["customer", "partner", "administrator"] },
  { label: "Requests", href: "/requests", icon: ClipboardList, roles: ["customer", "partner", "administrator"] },
  { label: "AMC Care", href: "/amc", icon: ShieldCheck, roles: ["customer", "partner", "administrator"] },
  { label: "Workspace", href: "/workspace", icon: Briefcase, roles: ["partner", "administrator"] },
  { label: "Profile", href: "/profile", icon: UserCircle, roles: ["customer", "partner", "administrator"] },
  { label: "Rewards", href: "/rewards", icon: Gift, roles: ["customer", "partner", "administrator"] },
  { label: "Activity", href: "/activity", icon: Bell, roles: ["customer", "partner", "administrator"] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["customer", "partner", "administrator"] },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, activeRole, logout } = useAuth();

  const handleNav = (href: string) => {
    router.push(href);
    onClose();
  };

  const filteredItems = navItems.filter((item) => item.roles.includes(activeRole));

  return (
    <>
      {isOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-72 border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 p-4 lg:hidden">
            <p className="text-sm font-bold text-slate-900">Navigation</p>
            <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="border-b border-slate-100 p-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <Avatar src={profile?.avatar} name={profile?.name || "User"} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-950">{profile?.name || "Guest User"}</p>
                  {profile?.customerId && <p className="mt-1 truncate text-[11px] font-medium text-slate-500">{profile.customerId}</p>}
                </div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="space-y-1">
              {filteredItems.map((item) => {
                      const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
                      return (
                        <li key={item.href}>
                          <button
                            onClick={() => handleNav(item.href)}
                            className={`group flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all ${
                              active
                                ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            }`}
                            aria-current={active ? "page" : undefined}
                          >
                            <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-white/15" : "bg-white text-slate-400 group-hover:text-blue-600"}`}>
                              <item.icon className="h-[18px] w-[18px]" />
                            </span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        </li>
                      );
                    })}
            </ul>
          </nav>

          {activeRole === "guest" && (
            <div className="px-3 pb-3">
              <button onClick={() => handleNav("/login")} className="w-full rounded-2xl border border-blue-100 bg-blue-50 p-3 text-left hover:bg-blue-100">
                <p className="text-sm font-bold text-blue-900">Sign in for full access</p>
                <p className="mt-1 text-xs leading-5 text-blue-700">Requests, chats, and AMC records need an account.</p>
              </button>
            </div>
          )}

          <div className="border-t border-slate-100 p-3">
            <button onClick={logout} className="flex h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50">
              <LogOut className="h-5 w-5" />
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
