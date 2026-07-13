"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { WorkspaceDashboard } from "@/components/workspace/WorkspaceDashboard";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const { activeRole, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && activeRole === "guest") {
      const returnTo = encodeURIComponent(window.location.href);
      window.location.replace(`https://app.amcmep.in/login?returnTo=${returnTo}`);
    }
  }, [activeRole, isLoading]);

  if (isLoading || activeRole === "guest") {
    return <main className="grid min-h-screen place-items-center bg-slate-50"><div className="text-center"><div className="mx-auto size-8 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" /><p className="mt-4 text-sm font-semibold text-slate-600">Verifying workspace access…</p></div></main>;
  }

  return (
    <AppShell>
      <WorkspaceDashboard />
    </AppShell>
  );
}
