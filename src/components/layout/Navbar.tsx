"use client";

import { Bell, Menu, Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";

export function Navbar({ onMenuClick }: { onMenuClick: () => void; showMenu?: boolean }) {
  const { profile } = useAuth();
  return <header className="fixed left-0 right-0 top-0 z-30 h-[72px] border-b border-slate-200 bg-white/95 backdrop-blur lg:left-64"><div className="flex h-full items-center gap-4 px-4 sm:px-6"><button onClick={onMenuClick} className="grid size-10 place-items-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation"><Menu size={20} /></button><div className="relative hidden max-w-xl flex-1 md:block"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:bg-white" placeholder="Search projects, people, requests, or documents" /></div><div className="ml-auto flex items-center gap-2"><button className="relative grid size-10 place-items-center rounded-md text-slate-600 hover:bg-slate-100" aria-label="Notifications"><Bell size={19} /></button><div className="flex items-center gap-2 border-l border-slate-200 pl-3"><Avatar src={profile?.avatar} name={profile?.name || "User"} size="sm" /><div className="hidden sm:block"><p className="max-w-40 truncate text-sm font-bold text-slate-900">{profile?.name || "Workspace member"}</p><p className="text-[11px] text-slate-500">Business workspace</p></div></div></div></div></header>;
}
