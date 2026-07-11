"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import type { UserRole } from "@/types";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const router = useRouter();
  const { isLoading, activeRole } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (allowedRoles && !allowedRoles.includes(activeRole)) {
        router.push("/");
      }
    }
  }, [isLoading, activeRole, allowedRoles, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    return null;
  }

  return <>{children}</>;
}
