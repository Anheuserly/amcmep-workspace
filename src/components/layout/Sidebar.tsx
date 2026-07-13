"use client";

import Image from "next/image";
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
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";

const navigation = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "My business", href: "/business", icon: Building2 },
  { label: "Partners & team", href: "/team", icon: Users },
  { label: "Work & projects", href: "/projects", icon: ClipboardList },
  { label: "AMC & services", href: "/services", icon: ShieldCheck },
  { label: "Finance", href: "/finance", icon: WalletCards },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Business settings", href: "/business-settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  async function signOut() {
    await logout();
    window.location.assign("https://app.amcmep.in");
  }

  return (
    <>
      {isOpen ? <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden" onClick={onClose} /> : null}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#071426] text-white transition-transform duration-200 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-4">
          <a href="/" className="flex min-w-0 items-center gap-3">
            <Image src="/amcmep-one-icon.png" alt="AMC MEP Workspace" width={42} height={42} className="rounded-lg" priority />
            <div className="min-w-0"><p className="truncate text-base font-bold">AMC MEP</p><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-300">Workspace</p></div>
          </a>
          <button onClick={onClose} className="rounded-md p-2 text-slate-300 hover:bg-white/10 lg:hidden" aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return <li key={item.href}><a href={item.href} onClick={onClose} className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-white/8 hover:text-white"}`}><item.icon size={18} /><span>{item.label}</span></a></li>;
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 p-3">
          <a href="https://app.amcmep.in" className="mb-2 flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-300 hover:bg-white/8 hover:text-white"><ArrowUpRight size={18} />Open One App</a>
          <button onClick={signOut} className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/10"><LogOut size={18} />Sign out</button>
          <div className="mt-3 border-t border-white/10 px-3 pt-3"><p className="truncate text-xs font-semibold text-white">{profile?.name || "Workspace member"}</p><p className="mt-1 truncate text-[11px] text-slate-400">{profile?.customerId || profile?.email}</p></div>
        </div>
      </aside>
    </>
  );
}
