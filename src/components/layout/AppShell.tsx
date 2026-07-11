"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { RoleGuard } from "./RoleGuard";
import { GuestAuthPrompt } from "./GuestAuthPrompt";
import type { UserRole } from "@/types";

interface AppShellProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function AppShell({ children, allowedRoles }: AppShellProps) {
  const { isLoading, activeRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const showSidebar = activeRole !== "guest";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="animate-spin h-10 w-10 border-4 border-primary-200 border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={allowedRoles}>
      <div className="min-h-screen bg-surface">
        <Navbar onMenuClick={() => setSidebarOpen(true)} showMenu={showSidebar} />
        <div className="flex">
          {showSidebar && <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />}
          <main className={`min-h-[calc(100vh-4rem)] flex-1 pt-16 ${showSidebar ? "lg:ml-72" : ""}`}>
            <div className="p-4 lg:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
        <GuestAuthPrompt />
      </div>
    </RoleGuard>
  );
}
