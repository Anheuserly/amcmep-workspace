"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "@/components/ui/Avatar";
import {
  Bell,
  ChevronDown,
  LogIn,
  Loader2,
  Menu,
  Search,
  X,
} from "lucide-react";

interface NavbarProps {
  onMenuClick: () => void;
  showMenu?: boolean;
}

interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  vertical: string;
}

export function Navbar({ onMenuClick, showMenu = true }: NavbarProps) {
  const router = useRouter();
  const { profile, activeRole } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const payload = await response.json();
        setResults(Array.isArray(payload.results) ? payload.results : []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const openResult = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.url);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-full items-center justify-between gap-3 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {showMenu && (
            <button onClick={onMenuClick} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open navigation">
              <Menu className="h-5 w-5" />
            </button>
          )}
          <button onClick={() => router.push("/")} className="flex min-w-0 items-center gap-2">
            <Image src="/amcmep-one-icon.png" alt="AMC MEP 24x7 One" width={36} height={36} className="rounded-xl shadow-sm" priority />
            <span className="hidden truncate text-lg font-black tracking-tight text-slate-950 sm:block">AMC MEP 24x7</span>
          </button>
        </div>

        <div ref={searchRef} className="relative hidden max-w-xl flex-1 md:block">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => query.trim().length >= 2 && setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && results[0]) openResult(results[0]);
              if (event.key === "Escape") setOpen(false);
            }}
            placeholder="Search community, services, and marketplace"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-100"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
          {open && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
              <div className="max-h-80 overflow-y-auto p-2">
                {searching ? (
                  <div className="flex items-center gap-2 px-3 py-4 text-sm font-medium text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Searching...
                  </div>
                ) : results.length ? (
                  results.map((result) => (
                    <button key={`${result.vertical}-${result.id}`} onClick={() => openResult(result)} className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-slate-50">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-bold text-slate-900">{result.title}</p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold capitalize text-slate-500">{result.vertical}</span>
                      </div>
                      {result.snippet && <p className="mt-1 truncate text-xs text-slate-500">{result.snippet}</p>}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-4 text-sm font-medium text-slate-500">No matching records found.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeRole === "guest" ? (
            <button
              onClick={() => router.push("/login")}
              className="hidden h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm shadow-blue-100 transition hover:bg-blue-700 sm:flex"
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          ) : (
            <button onClick={() => router.push("/activity")} className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100" aria-label="Activity">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </button>
          )}

          <button onClick={() => router.push(activeRole === "guest" ? "/login" : "/profile")} className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100" aria-label="Open profile">
            <Avatar src={profile?.avatar} name={profile?.name || "User"} size="sm" />
            <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
          </button>
        </div>
      </div>
    </header>
  );
}
