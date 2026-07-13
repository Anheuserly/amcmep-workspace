"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import type { UserRole } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AppShell({ children, allowedRoles }: AppShellProps) {
  const { isLoading, activeRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showSidebar = activeRole !== "guest";

  useEffect(() => {
    if (!isLoading && activeRole === "guest") {
      const returnTo = encodeURIComponent(window.location.href);
      window.location.replace(`https://app.amcmep.in/login?returnTo=${returnTo}`);
    }
  }, [activeRole, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin h-10 w-10 border-4 border-primary-200 border-t-primary rounded-full" />
      </div>
    );
  }

  if (activeRole === "guest") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
          <p className="mt-4 text-sm font-semibold text-slate-600">Opening secure sign in...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-slate-50">
        <Navbar onMenuClick={() => setSidebarOpen(true)} showMenu={showSidebar} />
        <div className="flex">
          {showSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
          <main className={`min-h-screen flex-1 pt-16 ${showSidebar ? "lg:ml-[220px]" : ""}`}>
            <div className="mx-auto max-w-[1500px] p-4 sm:p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
  );
}
