"use client";

import { CommunityHome } from "@/components/feed/CommunityHome";
import { AppShell } from "@/components/layout/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <CommunityHome />
    </AppShell>
  );
}
