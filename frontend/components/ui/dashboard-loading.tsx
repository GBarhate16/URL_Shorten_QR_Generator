"use client";

import { useDashboardData } from "@/contexts/dashboard-data-context";

interface DashboardLoadingProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function DashboardLoading({ children, fallback }: DashboardLoadingProps) {
  const { isInitializing } = useDashboardData();

  if (isInitializing) {
    return fallback || (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
